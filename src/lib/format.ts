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

/**
 * Human file size. Binary units (1 KB = 1024 B), matching what the OS reports,
 * so a file the user sees as "2.4 MB" does not read as 2.5 here.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  // One decimal below 10 (2.4 MB), none above (24 MB) — precision that stops
  // being useful as the number grows.
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}
