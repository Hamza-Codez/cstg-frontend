/**
 * Queue ordering (docs/UIUX_FRONTEND.md §7.2.1).
 *
 * "Most urgent first: overdue, then at-risk, then by due time." Sorting happens
 * client-side over the page the API returned — it is a *presentation* order, not
 * a claim about SLA state, which only the backend owns (SLA_ENGINE.md §6).
 */

import { slaState, type SlaState } from "./sla";
import type { TicketResponse } from "./types";

// Paused is a fourth tier BELOW on-track (spec05 frontend §6): a ticket
// waiting on its customer is nobody's next action, and floating it near the top
// on a stale due time would push real work down. It stays visible rather than
// filtered — an agent needs to see what they are waiting on.
const RANK: Record<SlaState, number> = {
  overdue: 0,
  "at-risk": 1,
  "on-track": 2,
  paused: 3,
};

/** Terminal tickets have stopped counting, so they sort last regardless of due time. */
function isSettled(ticket: TicketResponse): boolean {
  return ticket.status === "RESOLVED" || ticket.status === "CLOSED";
}

export function byUrgency(tickets: TicketResponse[], now: number): TicketResponse[] {
  return [...tickets].sort((a, b) => {
    const settledA = isSettled(a);
    const settledB = isSettled(b);
    if (settledA !== settledB) return settledA ? 1 : -1;

    if (!settledA) {
      const rankA = RANK[slaState(a.sla_due_at, now, a.created_at, a.status)];
      const rankB = RANK[slaState(b.sla_due_at, now, b.created_at, b.status)];
      if (rankA !== rankB) return rankA - rankB;
    }

    // Within a band, the soonest due time is the most pressing.
    return new Date(a.sla_due_at).getTime() - new Date(b.sla_due_at).getTime();
  });
}
