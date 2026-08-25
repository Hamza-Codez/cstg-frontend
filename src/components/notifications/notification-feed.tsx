"use client";

/**
 * The notifications page body (P21).
 *
 * A client component, unlike most list surfaces here, for one reason: dismissal
 * and clear-all are optimistic, and an optimistic update needs local state. The
 * *data* still arrives server-fetched — the page passes the first page in as a
 * prop and never fetches it here, so the session token stays server-side.
 *
 * Paging is URL-driven (`?cursor=`), the same shape the ticket queues use, so
 * "Load older" is a navigation the server answers rather than a second fetch
 * path grown alongside the bell's.
 */

import { Bell, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useNotifications } from "@/hooks/use-notifications";
import { formatDateTime } from "@/lib/format";
import { notificationSentence, notificationsPath } from "@/lib/labels";
import type { Audience, NotificationItem } from "@/lib/types";

export function NotificationFeed({
  audience,
  initialItems,
  nextCursor,
}: {
  audience: Audience;
  initialItems: NotificationItem[];
  nextCursor: string | null;
}) {
  // Seeded from the server render; the hook's own list is the bell's, which is
  // a different (shorter) window over the same data.
  const [items, setItems] = useState(initialItems);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const { dismiss, clearAll } = useNotifications();
  const { show } = useToast();

  const ticketPath = audience === "customer" ? "/requests" : "/tickets";
  const heading = audience === "customer" ? "Updates" : "Notifications";

  async function onDismiss(item: NotificationItem) {
    const index = items.findIndex((row) => row.event_id === item.event_id);
    setItems((current) => current.filter((row) => row.event_id !== item.event_id));

    if (!(await dismiss(item.event_id))) {
      // Back where it was, not at the end — a row that reappears elsewhere
      // reads as a second, different notification.
      setItems((current) => {
        const next = [...current];
        next.splice(index, 0, item);
        return next;
      });
      show("Couldn't dismiss that. It's still here.", "error");
    }
  }

  async function onClearAll() {
    const previous = items;
    setBusy(true);
    setItems([]);
    setConfirming(false);

    if (!(await clearAll())) {
      setItems(previous);
      show("Couldn't clear your notifications.", "error");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-medium">{heading}</h1>
        {items.length > 0 && (
          <Button variant="danger" onClick={() => setConfirming(true)} disabled={busy}>
            <Trash2 aria-hidden className="size-4" strokeWidth={1.5} />
            Clear all
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        // No CTA: there is no action to direct toward.
        <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface px-4 py-12">
          <Bell aria-hidden strokeWidth={1.5} className="size-6 text-structure" />
          <p className="text-sm text-text/60">You&apos;re all caught up.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-md border border-border bg-surface">
          {items.map((item) => (
            <li
              key={item.event_id}
              className="group relative flex items-start border-b border-border last:border-b-0 hover:bg-canvas"
            >
              <Link
                href={`${ticketPath}/${item.ticket_id}`}
                className="flex min-h-12 flex-1 flex-col gap-0.5 py-3 pl-4 pr-12"
              >
                <span className="flex items-start gap-2">
                  {/* Weight as well as the dot, so unread survives greyscale. */}
                  {!item.read && (
                    <span
                      aria-hidden
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-structure"
                    />
                  )}
                  <span
                    className={item.read ? "text-sm text-text/80" : "text-sm font-medium text-text"}
                  >
                    {notificationSentence(item, audience)}
                    {!item.read && <span className="sr-only"> — unread</span>}
                  </span>
                </span>
                <span className="truncate pl-4 text-xs text-text/60">{item.ticket_subject}</span>
                <time dateTime={item.created_at} className="pl-4 text-xs text-text/50">
                  {formatDateTime(item.created_at)}
                </time>
              </Link>

              {/* Named, not a bare "×" — fifty rows of "button, X" tells a
                  screen-reader user nothing. Hover AND focus, never hover-only. */}
              <button
                type="button"
                onClick={() => void onDismiss(item)}
                aria-label={`Dismiss — ${notificationSentence(item, audience)}`}
                className="absolute right-2 top-2 cursor-pointer rounded-sm p-2 bg-blue-900 text-white opacity-0 transition-opacity hover:bg-blue-800 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent group-hover:opacity-100"
              >
                <X aria-hidden strokeWidth={1.5} className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {nextCursor && items.length > 0 && (
        // A link, not a fetch: the server answers the next page, so no second
        // client fetch path grows here.
        <Link
          href={`${notificationsPath(audience)}?cursor=${encodeURIComponent(nextCursor)}`}
          className="self-center rounded-sm border border-border bg-surface px-4 py-2 text-sm text-structure hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Load older
        </Link>
      )}

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Clear all notifications?"
      >
        <div className="flex flex-col gap-4">
          {/* Says what survives, because the destructive-sounding word is
              "clear" and people reasonably fear it deletes the tickets. */}
          <p className="text-sm text-text/80">
            This empties your list. It only affects you — nobody else&apos;s notifications
            change, and no tickets or history are deleted. It can&apos;t be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void onClearAll()} disabled={busy}>
              Clear all
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
