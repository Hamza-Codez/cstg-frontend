"use client";

/**
 * SLA countdown — the signature component (docs/UIUX_FRONTEND.md §5).
 *
 * Ticks client-side from the frozen `deadline`. Display only: the backend owns
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
import type { Audience } from "@/lib/types";

const STAFF_TONE = {
  "on-track": "text-on-track",
  "at-risk": "text-at-risk",
  overdue: "text-overdue",
} as const;

export interface SlaCountdownProps {
  deadline: string;
  createdAt?: string;
  audience: Audience;
  /** Terminal tickets have stopped counting; show the due time without urgency. */
  settled?: boolean;
}

export function SlaCountdown({ deadline, createdAt, audience, settled }: SlaCountdownProps) {
  const { state, remainingMs } = useSlaCountdown(deadline, createdAt);
  const overdue = state === "overdue";

  const label =
    audience === "customer"
      ? overdue
        ? "Taking longer than expected"
        : `Expected by ${formatDateTime(deadline)}`
      : overdue
        ? `Overdue by ${formatDuration(remainingMs)}`
        : `Due by ${formatDateTime(deadline)} · ${formatDuration(remainingMs)} left`;

  return (
    <span
      suppressHydrationWarning
      className={cn(
        "inline-flex items-center gap-1.5 text-sm bg-surface px-2.5 py-1 rounded-sm shadow-sm",
        // Customers never get the red alarm treatment (§5).
        settled || audience === "customer" ? "text-text" : STAFF_TONE[state],
      )}
    >
      <Clock aria-hidden className="size-4" strokeWidth={1.5} />
      {settled ? `${audience === "customer" ? "Expected by" : "Due by"} ${formatDateTime(deadline)}` : label}
    </span>
  );
}
