"use client";

/**
 * Bell and panel (spec08 frontend §4–5).
 *
 * A popover, not a modal: reading notifications is a glance, and a
 * focus-trapping overlay is the wrong weight for it.
 */

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useNotifications } from "@/hooks/use-notifications";
import { formatDateTime } from "@/lib/format";
import { notificationSentence } from "@/lib/labels";
import type { Audience } from "@/lib/types";

export function NotificationBell({ audience }: { audience: Audience }) {
  const { count, items, loadingList, listError, openPanel } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    // Opening marks read: a badge that survives reading is noise.
    if (next) await openPanel();
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
        aria-label={
          count === 0 ? "Notifications, none unread" : `Notifications, ${count} unread`
        }
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
        <div className="absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-sm border border-border bg-surface shadow-lg">
          <p className="border-b border-border px-3 py-2 text-sm font-medium text-text">
            Notifications
          </p>

          {loadingList && <p className="px-3 py-4 text-sm text-text/60">Loading…</p>}

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
              <p className="text-sm text-text/60">You&apos;re all caught up.</p>
            </div>
          )}

          <ul className="max-h-80 overflow-y-auto">
            {items.map((item) => (
              <li key={item.event_id}>
                <Link
                  href={`${ticketPath}/${item.ticket_id}`}
                  onClick={() => setOpen(false)}
                  className="flex min-h-10 flex-col gap-0.5 border-b border-border px-3 py-2 last:border-b-0 hover:bg-canvas"
                >
                  <span className="text-sm text-text">
                    {notificationSentence(item, audience)}
                  </span>
                  <span className="truncate text-xs text-text/60">{item.ticket_subject}</span>
                  <time dateTime={item.created_at} className="text-xs text-text/50">
                    {formatDateTime(item.created_at)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
