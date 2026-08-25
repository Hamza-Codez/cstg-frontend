"use client";

/**
 * Bell and panel (spec08 frontend §4–5, extended at P21).
 *
 * A popover, not a modal: reading notifications is a glance, and a
 * focus-trapping overlay is the wrong weight for it.
 *
 * Since P21 the panel is a **history** of the last few notifications rather
 * than a queue that empties on open, each row individually dismissable. The
 * full list lives on the notifications page; this is deliberately the short
 * version, because a bell you have to scroll is a page in a costume.
 */

import { Bell, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useToast } from "@/components/ui/toast";
import { PANEL_LIMIT, useNotifications } from "@/hooks/use-notifications";
import { formatDateTime } from "@/lib/format";
import { notificationSentence, notificationsPath } from "@/lib/labels";
import type { Audience } from "@/lib/types";

export function NotificationBell({ audience }: { audience: Audience }) {
  const { count, items, loadingList, listError, openPanel, dismiss } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { show } = useToast();

  useEffect(() => {
    if (!open) return;
    function onAway(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onAway);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onAway);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    // Opening marks read: a badge that survives reading is noise. The rows
    // stay — only their unread marking goes.
    if (next) await openPanel();
  }

  async function onDismiss(eventId: string) {
    const ok = await dismiss(eventId);
    // The row has already come back by now if this failed; the toast explains
    // why it reappeared, which is otherwise baffling.
    if (!ok) show("Couldn't dismiss that. It's still here.", "error");
  }

  const ticketPath = audience === "customer" ? "/requests" : "/tickets";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-expanded={open}
        // The accessible name is the STATE, not the widget: a bare "Bell" tells
        // a screen-reader user nothing.
        aria-label={count === 0 ? "Notifications, none unread" : `Notifications, ${count} unread`}
        className="relative cursor-pointer rounded-sm p-1.5 text-text-inverse/90 hover:bg-text-inverse/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Bell aria-hidden strokeWidth={1.5} className="size-5" />
        {/* No badge at zero — never a badge showing 0. The accent is sanctioned
            here as an interactive affordance (§2.1); it is not a status. */}
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-accent px-1 text-[10px] font-medium leading-4 text-on-accent">
            {count >= 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* The only way a non-visual user learns a poll returned something. */}
      <span aria-live="polite" className="sr-only">
        {count > 0 ? `${count} unread notifications` : ""}
      </span>

      {open && (
        // `text-text` here is load-bearing, not decoration: this popover renders
        // inside the top bar, whose header sets `text-text-inverse`. Without an
        // explicit colour every row inherits white and disappears against the
        // white surface — which is exactly how it shipped and looked blank.
        <div className="absolute right-0 z-20 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-sm border border-border bg-surface text-text shadow-lg">
          <p className="border-b border-border bg-gradient-header px-3 py-2 text-sm font-medium text-text-inverse">
            Notifications
          </p>

          {loadingList && <p className="px-3 py-4 text-sm text-text-muted">Loading…</p>}

          {listError && (
            <div className="flex items-center justify-between gap-2 px-3 py-4">
              <p className="text-sm text-overdue">{listError}</p>
              <button
                type="button"
                onClick={() => void openPanel()}
                className="cursor-pointer text-xs text-structure underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loadingList && !listError && items.length === 0 && (
            // No CTA: there is no action to direct toward.
            <div className="flex flex-col items-center gap-2 px-3 py-6">
              <Bell aria-hidden strokeWidth={1.5} className="size-5 text-structure" />
              <p className="text-sm text-text-muted">You&apos;re all caught up.</p>
            </div>
          )}

          <ul className="custom-scrollbar max-h-96 overflow-y-auto">
            {items.slice(0, PANEL_LIMIT).map((item) => (
              <li
                key={item.event_id}
                className="group relative flex items-start border-b border-border last:border-b-0 hover:bg-canvas"
              >
                <Link
                  href={`${ticketPath}/${item.ticket_id}`}
                  onClick={() => setOpen(false)}
                  className="flex min-h-10 flex-1 flex-col gap-0.5 py-2 pl-3 pr-9"
                >
                  <span className="flex items-start gap-1.5">
                    {/* Weight carries the unread state as well as the dot, so it
                        survives greyscale and colour blindness. */}
                    {!item.read && (
                      <span
                        aria-hidden
                        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-structure"
                      />
                    )}
                    <span
                      className={
                        item.read ? "text-sm text-text" : "text-sm font-medium text-text"
                      }
                    >
                      {notificationSentence(item, audience)}
                      {!item.read && <span className="sr-only"> — unread</span>}
                    </span>
                  </span>
                  <span className="truncate pl-3 text-xs text-text-muted">{item.ticket_subject}</span>
                  <time dateTime={item.created_at} suppressHydrationWarning className="pl-3 text-xs text-text-muted">
                    {formatDateTime(item.created_at)}
                  </time>
                </Link>

                {/* Named, not a bare "×": a screen reader announcing "button, X"
                    seven times running says nothing about which one.

                    Always visible, never hover-revealed: hover does not exist on
                    a touch screen, so `opacity-0 group-hover:opacity-100` would
                    make dismissal unreachable on a phone entirely. */}
                <button
                  type="button"
                  onClick={(event) => {
                    // The row is a link; without this a dismissal would also
                    // navigate to the ticket it just removed.
                    event.preventDefault();
                    void onDismiss(item.event_id);
                  }}
                  aria-label={`Dismiss — ${notificationSentence(item, audience)}`}
                  className="absolute right-1 top-1 cursor-pointer rounded-sm border border-control-border bg-control p-1.5 text-text-inverse transition-colors hover:bg-control-hover hover:border-control-border-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <X aria-hidden strokeWidth={1.5} className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>

          {/* Not shown when the panel is empty: the page applies the same
              visibility rules, so it would lead somewhere equally empty — and
              the empty state is deliberately CTA-free. */}
          {items.length > 0 && (
            <Link
              href={notificationsPath(audience)}
              onClick={() => setOpen(false)}
              className="block border-t border-border px-3 py-2 text-center text-xs text-structure hover:bg-canvas hover:underline"
            >
              See all notifications
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
