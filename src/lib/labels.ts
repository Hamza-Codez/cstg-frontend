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
  EventType,
  Priority,
  Role,
  TicketStatus,
} from "./types";

const STATUS: Record<TicketStatus, Record<Audience, string>> = {
  OPEN: { customer: "Received", staff: "Open" },
  IN_PROGRESS: { customer: "In progress", staff: "In progress" },
  // The customer wording is a direct request for action. "Pending customer"
  // describes the ticket from the desk's side; the customer needs to know
  // that *they* are the blocker (spec05 frontend §3).
  PENDING_CUSTOMER: { customer: "Waiting for your reply", staff: "Waiting on customer" },
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
  waitForCustomer: "Wait for customer",
  resumeWork: "Resume work",
  reopen: "Reopen",
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

/**
 * One plain sentence per notification (spec08 frontend §5).
 *
 * Rows are sentences, never enum names. Customers never receive an
 * INTERNAL_NOTE notification — the backend filters on detail.type — but the
 * customer branch is written as if they might, so this is not the only thing
 * standing between an internal note and a customer.
 */
export function notificationSentence(
  event: { type: EventType; actor_name?: string | null; to_status?: TicketStatus | null },
  audience: Audience,
): string {
  const actor = event.actor_name ?? "Support";

  switch (event.type) {
    case "COMMENT":
      return audience === "customer" ? "Support replied to your request" : `${actor} replied`;
    case "STATUS_CHANGE": {
      const status = event.to_status ? statusLabel(event.to_status, audience) : "";
      return audience === "customer"
        ? `Your request is now ${status}`
        : `${actor} moved this to ${status}`;
    }
    case "SLA_BREACH":
      return audience === "customer" ? "Taking longer than expected" : "SLA breached";
    case "ASSIGNMENT":
      // Customers never receive these — who works a ticket is internal routing.
      return event.actor_name ? `${actor} reassigned this` : "Assigned automatically";
    case "ATTACHMENT":
      return audience === "customer" ? "A file was added" : `${actor} attached a file`;
    case "CREATED":
      return audience === "customer" ? "You sent this request" : `${actor} raised a ticket`;
  }
}
