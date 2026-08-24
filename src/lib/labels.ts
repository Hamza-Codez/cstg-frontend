/**
 * The only place a backend enum becomes user-facing text
 * (docs/UIUX_FRONTEND.md §4, FRONTEND_STRUCTURE.md §1.4).
 *
 * Two audiences, deliberately different wording: customers get the gentlest
 * phrasing, staff get precise-but-plain terms. Never render an enum directly —
 * a backend rename must never leak into the interface.
 */

import type {
  Audience,
  Category,
  CommentType,
  CustomerTier,
  Priority,
  Role,
  TicketStatus,
} from "./types";

const STATUS: Record<TicketStatus, Record<Audience, string>> = {
  OPEN: { customer: "Received", staff: "Open" },
  IN_PROGRESS: { customer: "In progress", staff: "In progress" },
  RESOLVED: { customer: "Resolved", staff: "Resolved" },
  CLOSED: { customer: "Closed", staff: "Closed" },
};

// Priority is hidden from customers entirely (§4), so it has no customer column.
const PRIORITY: Record<Priority, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const CATEGORY: Record<Category, string> = {
  OUTAGE: "Service is down",
  BILLING: "Billing",
  TECHNICAL: "Technical",
  GENERAL: "General",
};

const TIER: Record<CustomerTier, string> = {
  ENTERPRISE: "Enterprise",
  BUSINESS: "Business",
  FREE: "Free",
};

const ROLE: Record<Role, string> = {
  CUSTOMER: "Customer",
  AGENT: "Agent",
  DISPATCHER: "Dispatcher",
  ADMIN: "Admin",
};

// INTERNAL_NOTE is never shown to a customer; callers must not request it.
const COMMENT_TYPE: Record<CommentType, string> = {
  INTERNAL_NOTE: "Internal note",
  PUBLIC_REPLY: "Reply",
};

/** Nouns that differ by audience (§4). */
const TERMS = {
  ticket: { customer: "Request", staff: "Ticket" },
  tickets: { customer: "Requests", staff: "Tickets" },
  deadline: { customer: "Expected resolution by", staff: "Due by" },
  overdue: { customer: "Taking longer than expected", staff: "Overdue" },
  escalated: { customer: "Prioritised", staff: "Escalated" },
  assignee: { customer: "Your support agent", staff: "Owner" },
  activity: { customer: "Updates", staff: "Activity" },
  tier: { customer: "Plan", staff: "Plan" },
} satisfies Record<string, Record<Audience, string>>;

/** Action labels — identical across the flow, and never "Submit" (§3.1). */
export const ACTIONS = {
  newRequest: "New request",
  send: "Send",
  reply: "Reply",
  addInternalNote: "Add internal note",
  start: "Start working",
  resolve: "Resolve",
  close: "Close",
  assign: "Assign",
  reassign: "Reassign",
  signIn: "Sign in",
  signUp: "Create account",
  signOut: "Sign out",
  cancel: "Cancel",
} as const;

export function statusLabel(status: TicketStatus, audience: Audience): string {
  return STATUS[status][audience];
}

export function priorityLabel(priority: Priority): string {
  return PRIORITY[priority];
}

export function categoryLabel(category: Category): string {
  return CATEGORY[category];
}

/** Shown to staff as the customer's plan (§4). */
export function tierLabel(tier: CustomerTier): string {
  return TIER[tier];
}

export function roleLabel(role: Role): string {
  return ROLE[role];
}

export function commentTypeLabel(type: CommentType): string {
  return COMMENT_TYPE[type];
}

export function term(key: keyof typeof TERMS, audience: Audience): string {
  return TERMS[key][audience];
}
