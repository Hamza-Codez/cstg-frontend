/**
 * Updates / Activity timeline (docs/UIUX_FRONTEND.md §5).
 *
 * Renders each event as a plain sentence — never an enum. The backend already
 * scoped this list to what the principal may see, so nothing is filtered here.
 */

import { CircleDashed, CircleDot, History, TriangleAlert, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { formatDateTime } from "@/lib/format";
import { statusLabel } from "@/lib/labels";
import type { Audience, EventType, TicketEventResponse } from "@/lib/types";

const ICONS: Record<EventType, LucideIcon> = {
  CREATED: CircleDot,
  STATUS_CHANGE: CircleDashed,
  ASSIGNMENT: UserPlus,
  COMMENT: History,
  SLA_BREACH: TriangleAlert,
};

function sentence(event: TicketEventResponse, audience: Audience): string {
  switch (event.type) {
    case "CREATED":
      return audience === "customer" ? "You sent this request" : "Ticket created";
    case "STATUS_CHANGE": {
      const to = event.to_status ? statusLabel(event.to_status, audience) : "";
      return to === statusLabel("RESOLVED", audience)
        ? audience === "customer"
          ? "Marked resolved by support"
          : "Resolved"
        : `Status changed to ${to}`;
    }
    case "ASSIGNMENT":
      return "Assigned to an agent";
    case "COMMENT":
      return "A note was added";
    case "SLA_BREACH":
      return audience === "customer"
        ? "This is taking longer than expected — we have prioritised it"
        : "SLA marked overdue by system";
  }
}

export function Timeline({
  events,
  audience,
}: {
  events: TicketEventResponse[];
  audience: Audience;
}) {
  if (events.length === 0) {
    return <p className="text-sm text-text/60">Nothing has happened yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {events.map((event) => {
        const Icon = ICONS[event.type];
        const resolved = event.type === "STATUS_CHANGE" && event.to_status === "RESOLVED";
        return (
          <li key={event.id} className="flex items-start gap-3">
            <Icon
              aria-hidden
              strokeWidth={1.5}
              className={resolved ? "mt-0.5 size-4 text-on-track" : "mt-0.5 size-4 text-structure"}
            />
            <span className="flex flex-col">
              <span className="text-sm text-text">{sentence(event, audience)}</span>
              <time dateTime={event.created_at} className="text-xs text-text/60">
                {formatDateTime(event.created_at)}
              </time>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
