/**
 * Ticket filters as URL state (spec04 frontend §2).
 *
 * Filters live in the query string, not component state. That is not a
 * stylistic choice: the list pages are Server Components that fetch with the
 * session token, so client-held filters would force the whole list to the
 * client — which would mean shipping the token or adding a client fetch path,
 * both ruled out by FRONTEND_STRUCTURE.md §5.
 *
 * It also makes a filtered view shareable, bookmarkable, and correct under
 * back/forward, and is why no global store is needed.
 */

import type { Category, CustomerTier, Priority, Role, TicketStatus } from "@/lib/types";

/**
 * Enum members, checked against the generated unions at compile time. A backend
 * rename breaks the build here rather than silently producing a filter the API
 * rejects.
 */
export const STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const satisfies readonly TicketStatus[];

export const PRIORITIES = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
] as const satisfies readonly Priority[];

export const CATEGORIES = [
  "OUTAGE",
  "BILLING",
  "TECHNICAL",
  "GENERAL",
] as const satisfies readonly Category[];

export const TIERS = [
  "ENTERPRISE",
  "BUSINESS",
  "FREE",
] as const satisfies readonly CustomerTier[];

/**
 * Filters that reach beyond a principal's own work. The backend refuses these
 * with 403 for customers and agents (spec04 §4); the UI simply does not render
 * them, which is UX, never the boundary.
 */
export const STAFF_WIDE_FILTERS = ["tier", "assignee_id", "customer_id"] as const;

export interface TicketFilterValues {
  q?: string;
  status?: TicketStatus;
  priority?: Priority;
  category?: Category;
  breached?: boolean;
  assigned?: boolean;
  escalated?: boolean;
  tier?: CustomerTier;
  assignee_id?: string;
  customer_id?: string;
  created_after?: string;
  created_before?: string;
}

/** Every key the filter bar owns. `cursor` and `limit` are deliberately absent. */
export const FILTER_KEYS = [
  "q",
  "status",
  "priority",
  "category",
  "breached",
  "assigned",
  "escalated",
  "tier",
  "assignee_id",
  "customer_id",
  "created_after",
  "created_before",
] as const;

type RawParams = Record<string, string | string[] | undefined>;

function one(raw: RawParams, key: string): string | undefined {
  const value = raw[key];
  return Array.isArray(value) ? value[0] : value;
}

function member<T extends string>(
  raw: RawParams,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = one(raw, key);
  // An invalid enum value is dropped rather than forwarded. Passing it on
  // would earn a 400 from the API for what is almost always a stale or
  // hand-edited URL.
  return value !== undefined && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

function flag(raw: RawParams, key: string): boolean | undefined {
  const value = one(raw, key);
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function isoDate(raw: RawParams, key: string): string | undefined {
  const value = one(raw, key);
  if (!value) return undefined;
  return Number.isNaN(new Date(value).getTime()) ? undefined : value;
}

/** Read filters out of a URL. Unknown keys and invalid values are dropped. */
export function parseFilters(raw: RawParams): TicketFilterValues {
  const q = one(raw, "q")?.trim();
  return stripUndefined({
    q: q ? q.slice(0, 200) : undefined,
    status: member(raw, "status", STATUSES),
    priority: member(raw, "priority", PRIORITIES),
    category: member(raw, "category", CATEGORIES),
    breached: flag(raw, "breached"),
    assigned: flag(raw, "assigned"),
    escalated: flag(raw, "escalated"),
    tier: member(raw, "tier", TIERS),
    assignee_id: one(raw, "assignee_id"),
    customer_id: one(raw, "customer_id"),
    created_after: isoDate(raw, "created_after"),
    created_before: isoDate(raw, "created_before"),
  });
}

function stripUndefined(values: TicketFilterValues): TicketFilterValues {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as TicketFilterValues;
}

/**
 * Apply a change to the current query string.
 *
 * **Drops `cursor`.** A cursor encodes a position in one specific ordering; the
 * backend rejects it with 400 once the query shape changes (spec04 §5). Keeping
 * a stale cursor across a filter change produces an error on the very first
 * interaction after filtering, which reads as a broken page. One helper owns
 * this so no call site can forget it.
 */
export function applyFilterChange(
  current: URLSearchParams,
  patch: Partial<Record<(typeof FILTER_KEYS)[number], string | undefined>>,
): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  next.delete("cursor");
  return next;
}

/** Clear every filter, keeping any unrelated params the page may rely on. */
export function clearFilters(current: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const key of FILTER_KEYS) next.delete(key);
  next.delete("cursor");
  return next;
}

export function toSearchParams(filters: TicketFilterValues): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    // `null` is rejected as firmly as `undefined`: the API models every filter
    // as nullable, so a saved view round-trips explicit nulls. Passing those
    // through would put the literal string "null" in the URL — harmless for an
    // enum (parseFilters drops it) but not for `q`, which would search for the
    // word "null".
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  return params;
}

export function hasActiveFilters(filters: TicketFilterValues): boolean {
  return Object.keys(filters).length > 0;
}

/** Whether this role may use the staff-wide filters at all (UX gate only). */
export function canUseStaffWideFilters(role: Role): boolean {
  return role === "DISPATCHER" || role === "ADMIN";
}
