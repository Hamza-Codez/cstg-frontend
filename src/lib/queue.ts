/**
 * Queue ordering (docs/UIUX_FRONTEND.md §7.2.1).
 *
 * "Most urgent first: overdue, then at-risk, then by due time." Sorting happens
 * client-side over the page the API returned — it is a *presentation* order, not
 * a claim about SLA state, which only the backend owns (SLA_ENGINE.md §6).
 */

import { slaState, type SlaState } from "./sla";
import type { TicketResponse } from "./types";

const RANK: Record<SlaState, number> = { overdue: 0, "at-risk": 1, "on-track": 2 };

/** Terminal tickets have stopped counting, so they sort last regardless of deadline. */
function isSettled(ticket: TicketResponse): boolean {
  return ticket.status === "RESOLVED" || ticket.status === "CLOSED";
}

export function byUrgency(tickets: TicketResponse[], now: number): TicketResponse[] {
  return [...tickets].sort((a, b) => {
    const settledA = isSettled(a);
    const settledB = isSettled(b);
    if (settledA !== settledB) return settledA ? 1 : -1;

    if (!settledA) {
      const rankA = RANK[slaState(a.deadline, now, a.created_at)];
      const rankB = RANK[slaState(b.deadline, now, b.created_at)];
      if (rankA !== rankB) return rankA - rankB;
    }

    // Within a band, the soonest deadline is the most pressing.
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
}
