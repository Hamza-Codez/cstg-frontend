/**
 * Client-side SLA state (docs/SPEC/SLA_ENGINE.md §6, spec05 frontend §2).
 *
 * DISPLAY ONLY. Breach and escalation are computed and committed server-side
 * from database timestamps; this timer has no authority over any SLA outcome
 * (NFR-1). It exists so a user can see urgency without refreshing.
 *
 * **Counts to `sla_due_at`, not `deadline`.** `deadline` is the frozen original
 * promise and stays in the API response as the record of what was committed to;
 * `sla_due_at` is the current effective due time, which a pause moves. The
 * argument is named `dueAt` rather than repointed so every call site is a
 * compile error until it is checked (spec05 frontend §1).
 */

import type { TicketStatus } from "@/lib/types";

export type SlaState = "on-track" | "at-risk" | "overdue" | "paused";

/** At-risk once under an hour, or under a quarter of the window (§5). */
const AT_RISK_MS = 60 * 60 * 1000;
const AT_RISK_FRACTION = 0.25;

export function slaState(
  dueAtIso: string,
  now: number,
  createdAtIso?: string,
  status?: TicketStatus,
): SlaState {
  // Checked first, ahead of everything. While paused `sla_due_at` holds its
  // pre-pause value and is stale by design — nothing on the backend reads it,
  // because the monitor's index excludes paused tickets. Without this branch
  // the staleness would render as lateness.
  if (status === "PENDING_CUSTOMER") return "paused";

  const dueAt = new Date(dueAtIso).getTime();
  const remaining = dueAt - now;
  // Strictly after, matching SLA_ENGINE.md §1 (`now > due`). At the exact due
  // instant the ticket is not yet in breach, and resolving then still counts as
  // met (§4) — the display must not contradict the backend by a millisecond.
  if (remaining < 0) return "overdue";

  if (createdAtIso) {
    const total = dueAt - new Date(createdAtIso).getTime();
    if (total > 0 && remaining / total <= AT_RISK_FRACTION) return "at-risk";
  }
  return remaining <= AT_RISK_MS ? "at-risk" : "on-track";
}

/** Whole-unit breakdown of a duration, for "2h 41m left". */
export function splitDuration(ms: number): { days: number; hours: number; minutes: number } {
  const totalMinutes = Math.floor(Math.abs(ms) / 60000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}
