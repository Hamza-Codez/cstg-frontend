"use client";

/**
 * Notification polling (spec08 frontend §2).
 *
 * The backend is a read model with no push channel, and ARCHITECTURE.md §10
 * freezes out websockets, so the client polls.
 *
 * 60 seconds is deliberate: this is a badge, not a chat client. A minute-stale
 * count costs nothing, and a tighter interval multiplies load across every open
 * tab for no perceptible gain.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { NotificationItem } from "@/lib/types";

const POLL_MS = 60_000;
/** After three consecutive failures, back off rather than hammering. */
const BACKOFF_MS = 5 * 60_000;
const FAILURES_BEFORE_BACKOFF = 3;

export interface NotificationsState {
  count: number;
  items: NotificationItem[];
  loadingList: boolean;
  listError: string | null;
}

export function useNotifications(): NotificationsState & {
  openPanel: () => Promise<void>;
  markRead: () => Promise<void>;
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
      if (response.ok) setCount(0);
    } catch {
      // Same posture as the poll: ambient, silent, self-recovering.
    }
  }, []);

  const openPanel = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const response = await fetch("/api/notifications?limit=20", { cache: "no-store" });
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

  return { count, items, loadingList, listError, openPanel, markRead };
}
