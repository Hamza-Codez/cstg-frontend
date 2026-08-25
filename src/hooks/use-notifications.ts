"use client";

/**
 * Notification polling and per-item dismissal (spec08 frontend §2, P21).
 *
 * The backend is a read model with no push channel, and ARCHITECTURE.md §10
 * freezes out websockets, so the client polls.
 *
 * 60 seconds is deliberate: this is a badge, not a chat client. A minute-stale
 * count costs nothing, and a tighter interval multiplies load across every open
 * tab for no perceptible gain.
 *
 * Since P21 the panel holds a **history** — read and unread — so opening it no
 * longer empties it. `read` arrives per item from the server rather than being
 * derived here against `last_read_at`, which would make the rendering depend on
 * the browser's clock agreeing with the database's.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { NotificationItem } from "@/lib/types";

const POLL_MS = 60_000;
/** After three consecutive failures, back off rather than hammering. */
const BACKOFF_MS = 5 * 60_000;
const FAILURES_BEFORE_BACKOFF = 3;

/** The bell is a glance, not an archive — the page is where the rest lives. */
export const PANEL_LIMIT = 7;

export interface NotificationsState {
  count: number;
  items: NotificationItem[];
  loadingList: boolean;
  listError: string | null;
}

export function useNotifications(): NotificationsState & {
  openPanel: () => Promise<void>;
  markRead: () => Promise<void>;
  dismiss: (eventId: string) => Promise<boolean>;
  clearAll: () => Promise<boolean>;
} {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const failures = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Poll failures are SILENT (spec08 frontend §6).
   *
   * Notifications are ambient: a toast on every failed background poll would be
   * worse than the outage it reports. The last known count is kept rather than
   * zeroed, because showing 0 would read as "all caught up" — a wrong answer,
   * not a missing one.
   */
  const refreshCount = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/count", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { unread_count: number };
      setCount(data.unread_count);
      failures.current = 0;
    } catch {
      failures.current += 1;
    }
  }, []);

  // Poll on a timer, but only while the tab is visible. A background tab
  // polling every minute for hours is pure waste, and the focus listener below
  // means a returning user sees a current count immediately anyway — which is
  // the moment that actually matters.
  useEffect(() => {
    let cancelled = false;

    function schedule() {
      if (cancelled) return;
      const delay = failures.current >= FAILURES_BEFORE_BACKOFF ? BACKOFF_MS : POLL_MS;
      timer.current = setTimeout(async () => {
        if (document.visibilityState === "visible") await refreshCount();
        schedule();
      }, delay);
    }

    void refreshCount();
    schedule();

    function onVisible() {
      if (document.visibilityState === "visible") void refreshCount();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refreshCount]);

  /** Opening marks read: a badge that survives reading is noise. */
  const markRead = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (response.ok) {
        setCount(0);
        // The rows stay; only their unread marking goes. Before P21 they would
        // have vanished, because the list *was* the unread list.
        setItems((current) => current.map((item) => ({ ...item, read: true })));
      }
    } catch {
      // Same posture as the poll: ambient, silent, self-recovering.
    }
  }, []);

  const openPanel = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const response = await fetch(`/api/notifications?limit=${PANEL_LIMIT}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { items: NotificationItem[] };
      setItems(data.items);
      // The list is a deliberate user action, so its failure IS worth showing —
      // unlike the background poll.
      await markRead();
    } catch {
      setListError("Couldn't load notifications.");
    } finally {
      setLoadingList(false);
    }
  }, [markRead]);

  /**
   * Dismiss one, **optimistically**.
   *
   * The row goes at once and comes back if the request fails. Unlike the
   * background poll, this is a deliberate act on a specific thing: leaving a
   * row visible for a round trip feels broken, and leaving it *gone* after a
   * failure is a lie about what the server holds. Returns whether it stuck, so
   * the caller can decide how loudly to say otherwise.
   */
  const dismiss = useCallback(async (eventId: string): Promise<boolean> => {
    let removed: NotificationItem | undefined;
    let index = -1;

    setItems((current) => {
      index = current.findIndex((item) => item.event_id === eventId);
      if (index === -1) return current;
      removed = current[index];
      return current.filter((item) => item.event_id !== eventId);
    });
    // Only an unread one was contributing to the badge.
    if (removed && !removed.read) setCount((n) => Math.max(0, n - 1));

    try {
      const response = await fetch(`/api/notifications/${eventId}`, { method: "DELETE" });
      if (!response.ok) throw new Error(String(response.status));
      return true;
    } catch {
      // Restore at its original position, not at the end — a row that
      // reappears somewhere else reads as a second, different notification.
      if (removed) {
        const restored = removed;
        const at = index;
        setItems((current) => {
          const next = [...current];
          next.splice(at, 0, restored);
          return next;
        });
        if (!restored.read) setCount((n) => n + 1);
      }
      return false;
    }
  }, []);

  /** Clear everything, optimistically, with the same rollback contract. */
  const clearAll = useCallback(async (): Promise<boolean> => {
    let previousItems: NotificationItem[] = [];
    let previousCount = 0;

    setItems((current) => {
      previousItems = current;
      return [];
    });
    setCount((current) => {
      previousCount = current;
      return 0;
    });

    try {
      const response = await fetch("/api/notifications/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error(String(response.status));
      return true;
    } catch {
      setItems(previousItems);
      setCount(previousCount);
      return false;
    }
  }, []);

  return { count, items, loadingList, listError, openPanel, markRead, dismiss, clearAll };
}
