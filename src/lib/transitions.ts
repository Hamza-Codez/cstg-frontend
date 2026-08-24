/**
 * Which transitions a principal may drive right now.
 *
 * Mirrors the transition table in docs/SPEC/TICKET_LIFECYCLE.md §2 and the matrix
 * in AUTHORIZATION.md §3. This is UX only — "show the next action, hide the
 * impossible" (§1.2). The backend re-decides every one of these and is the
 * authority; a stale UI can only produce a rejected call, never a wrong state.
 */

import { ACTIONS } from "./labels";
import type { Role, TicketStatus } from "./types";

export interface TransitionOption {
  to: TicketStatus;
  label: string;
}

const TABLE: Array<{
  from: TicketStatus;
  to: TicketStatus;
  label: string;
  roles: Role[];
  /** T1 additionally requires an assignee (TICKET_LIFECYCLE.md §2 guard). */
  requiresAssignee?: boolean;
}> = [
  {
    from: "OPEN",
    to: "IN_PROGRESS",
    label: ACTIONS.start,
    roles: ["AGENT", "ADMIN"],
    requiresAssignee: true,
  },
  { from: "IN_PROGRESS", to: "RESOLVED", label: ACTIONS.resolve, roles: ["AGENT", "ADMIN"] },
  { from: "RESOLVED", to: "CLOSED", label: ACTIONS.close, roles: ["AGENT", "DISPATCHER", "ADMIN"] },
];

export function availableTransitions(
  status: TicketStatus,
  role: Role,
  options: { hasAssignee: boolean; isAssignedToMe: boolean },
): TransitionOption[] {
  return TABLE.filter((row) => {
    if (row.from !== status) return false;
    if (!row.roles.includes(role)) return false;
    if (row.requiresAssignee && !options.hasAssignee) return false;
    // "AGENT" in the table means the *assigned* agent.
    if (role === "AGENT" && !options.isAssignedToMe) return false;
    return true;
  }).map(({ to, label }) => ({ to, label }));
}
