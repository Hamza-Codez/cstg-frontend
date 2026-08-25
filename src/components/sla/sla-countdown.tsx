"use client";

/**
 * SLA countdown — the signature component (docs/UIUX_FRONTEND.md §5).
 *
 * Ticks client-side from `sla_due_at` — the effective due time, which a pause
 * moves. Display only: the backend owns
 * breach state (SLA_ENGINE.md §6).
 *
 * The customer variant deliberately drops alarm language — no red, no "Overdue",
 * just "Taking longer than expected" (§4). A customer waiting on a fix should not
 * be made to feel they are watching a failure clock.
 */

import { Clock } from "lucide-react";

import { useSlaCountdown } from "@/hooks/use-sla-countdown";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { SlaState } from "@/lib/sla";
import type { Audience, TicketStatus } from "@/lib/types";

const STAFF_TONE: Record<SlaState, string> = {
  "on-track": "text-on-track",
  "at-risk": "text-at-risk",
  overdue: "text-overdue",
  // Muted, NOT a signalling colour. on-track/at-risk/overdue mean SLA health;
  // paused is the absence of a running clock, not a health verdict. Green would
  // say "healthy" about a ticket nobody is working (spec05 frontend §2).
  paused: "text-text/60",
};

export interface SlaCountdownProps {
  /**
   * The *effective* due time (`sla_due_at`), not the frozen `deadline`. Named
   * `dueAt` so repointing it was a compile error at every call site rather than
   * a silent change of meaning (spec05 frontend §1).
   */
  dueAt: string;
  createdAt?: string;
  audience: Audience;
  /** Terminal tickets have stopped counting; show the due time without urgency. */
  settled?: boolean;
  /** Drives the paused state; a paused clock does not tick. */
  status?: TicketStatus;
}

export function SlaCountdown({
  dueAt,
  createdAt,
  audience,
  settled,
  status,
}: SlaCountdownProps) {
  const { state, remainingMs } = useSlaCountdown(dueAt, createdAt, status);
  const overdue = state === "overdue";
  const paused = state === "paused";

  const label = paused
    ? // The label carries the meaning: a frozen number and a running one look
      // identical for the first second, which is also why colour is never the
      // sole signal here.
      audience === "customer"
      ? "Waiting for your reply"
      : "Paused — waiting on customer"
    : audience === "customer"
      ? overdue
        ? "Taking longer than expected"
        : `Expected by ${formatDateTime(dueAt)}`
      : overdue
        ? `Overdue by ${formatDuration(remainingMs)}`
        : `Due by ${formatDateTime(dueAt)} · ${formatDuration(remainingMs)} left`;

  return (
    <span
      suppressHydrationWarning
      className={cn(
        "inline-flex items-center gap-1.5 text-sm bg-surface px-2.5 py-1 rounded-sm shadow-sm",
        // Customers never get the red alarm treatment (§5).
        // Paused is muted for both audiences; customers never get the red
        // alarm treatment either way (§5).
        paused
          ? STAFF_TONE.paused
          : settled || audience === "customer"
            ? "text-text"
            : STAFF_TONE[state],
      )}
    >
      <Clock aria-hidden className="size-4" strokeWidth={1.5} />
      {settled && !paused
        ? `${audience === "customer" ? "Expected by" : "Due by"} ${formatDateTime(dueAt)}`
        : label}
    </span>
  );
}
