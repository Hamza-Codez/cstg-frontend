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
  /**
   * The one primary action, if any. The lifecycle stopped being linear at P16 —
   * from IN_PROGRESS an agent can resolve *or* wait on the customer — so the
   * panel can no longer assume a single option. UIUX_FRONTEND.md §3.1 still
   * allows only one primary CTA per view, so resolving wins and pausing is
   * secondary (spec05 frontend §4).
   */
  primary: boolean;
}

const TABLE: Array<{
  from: TicketStatus;
  to: TicketStatus;
  label: string;
  roles: Role[];
  /** T1 additionally requires an assignee (TICKET_LIFECYCLE.md §2 guard). */
  requiresAssignee?: boolean;
  primary?: boolean;
}> = [
  {
    from: "OPEN",
    to: "IN_PROGRESS",
    label: ACTIONS.start,
    roles: ["AGENT", "ADMIN"],
    requiresAssignee: true,
  },
  {
    from: "IN_PROGRESS",
    to: "RESOLVED",
    label: ACTIONS.resolve,
    roles: ["AGENT", "ADMIN"],
    primary: true,
  },
  {
    from: "RESOLVED",
    to: "CLOSED",
    label: ACTIONS.close,
    roles: ["AGENT", "DISPATCHER", "ADMIN"],
    primary: true,
  },
  // T4 — secondary beside Resolve, which stays the primary move.
  {
    from: "IN_PROGRESS",
    to: "PENDING_CUSTOMER",
    label: ACTIONS.waitForCustomer,
    roles: ["AGENT", "ADMIN"],
  },
  // T5 — staff resume. The customer's own resume happens automatically when
  // they reply, so it is not offered as a button in the portal.
  {
    from: "PENDING_CUSTOMER",
    to: "IN_PROGRESS",
    label: ACTIONS.resumeWork,
    roles: ["AGENT", "ADMIN"],
    primary: true,
  },
  // T6 — reopen. Rendered for ANY resolved ticket: the window is a backend rule
  // and TicketResponse carries no "is reopenable" flag, so recomputing it here
  // would duplicate the rule against a config the client does not have. A 422
  // explains it instead (spec05 frontend §4).
  {
    from: "RESOLVED",
    to: "IN_PROGRESS",
    label: ACTIONS.reopen,
    roles: ["AGENT", "DISPATCHER", "ADMIN"],
  },
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
  }).map(({ to, label, primary }) => ({ to, label, primary: primary ?? false }));
}
