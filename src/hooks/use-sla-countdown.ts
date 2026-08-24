"use client";

import { useEffect, useState } from "react";

import { slaState, type SlaState } from "@/lib/sla";

/**
 * Ticks once a minute — the display is coarse to the minute, so a per-second
 * interval would re-render sixty times for no visible change.
 */
const TICK_MS = 30_000;

export interface Countdown {
  state: SlaState;
  remainingMs: number;
}

export function useSlaCountdown(deadlineIso: string, createdAtIso?: string): Countdown {
  // Start from a deterministic value so the server render and the first client
  // render agree; the interval takes over immediately after mount.
  const [now, setNow] = useState(() => new Date(deadlineIso).getTime());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const deadline = new Date(deadlineIso).getTime();
  return {
    state: mounted ? slaState(deadlineIso, now, createdAtIso) : "on-track",
    remainingMs: deadline - now,
  };
}
