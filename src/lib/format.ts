/** Date and duration formatting (docs/UIUX_FRONTEND.md §5). */

import { splitDuration } from "./sla";

/** "3:00 PM" — the time a deadline falls. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "12 Jan, 3:00 PM" — used when the deadline is not today. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * "2h 41m", "3d 4h", "12m". Coarse on purpose: a seconds-level countdown reads
 * as alarm, and the value is display-only anyway.
 */
export function formatDuration(ms: number): string {
  const { days, hours, minutes } = splitDuration(ms);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
