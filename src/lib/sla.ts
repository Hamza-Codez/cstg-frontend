/**
 * Client-side SLA state (docs/SPEC/SLA_ENGINE.md §6).
 *
 * DISPLAY ONLY. Breach and escalation are computed and committed server-side from
 * database timestamps; this timer has no authority over any SLA outcome (NFR-1).
 * It exists so a user can see urgency without refreshing.
 */

export type SlaState = "on-track" | "at-risk" | "overdue";

/** At-risk once under an hour, or under a quarter of the window (§5). */
const AT_RISK_MS = 60 * 60 * 1000;
const AT_RISK_FRACTION = 0.25;

export function slaState(
  deadlineIso: string,
  now: number,
  createdAtIso?: string,
): SlaState {
  const deadline = new Date(deadlineIso).getTime();
  const remaining = deadline - now;
  // Strictly after, matching SLA_ENGINE.md §1 (`now > deadline`). At the exact
  // deadline the ticket is not yet in breach, and resolving then still counts
  // as met (§4) — the display must not contradict the backend by a millisecond.
  if (remaining < 0) return "overdue";

  if (createdAtIso) {
    const total = deadline - new Date(createdAtIso).getTime();
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
