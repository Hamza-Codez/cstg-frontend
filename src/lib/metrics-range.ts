/**
 * Dashboard date range and bucket selection (spec09 frontend §3).
 *
 * Pure and DOM-free, so the bucket boundaries are testable without rendering
 * anything — the same reasoning that keeps `lib/sla.ts` separate from the
 * components that display it.
 *
 * The range lives in the URL rather than component state, for the reason
 * filters do in spec04: the tabs are Server Components that fetch with the
 * session token, so a shareable dashboard link costs nothing and a client
 * fetch path is never introduced.
 */

import type { MetricBucket, MetricSeries } from "@/lib/types";

export const PRESETS = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "mtd", label: "This month", days: null },
  { id: "custom", label: "Custom", days: null },
] as const;

export type PresetId = (typeof PRESETS)[number]["id"];

export const SERIES: Array<{ id: MetricSeries; label: string }> = [
  { id: "created", label: "Created" },
  { id: "resolved", label: "Resolved" },
  { id: "breached", label: "Breached" },
  { id: "breach_rate", label: "Breach rate" },
];

export const BUCKETS: Array<{ id: MetricBucket; label: string }> = [
  { id: "day", label: "Daily" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
];

/** The backend refuses more than this many points (spec09 §3). */
export const MAX_BUCKETS = 366;

const DAY_MS = 86_400_000;

export interface Range {
  from: Date;
  to: Date;
  bucket: MetricBucket;
  metric: MetricSeries;
  preset: PresetId;
}

/**
 * Pick a bucket from the span.
 *
 * Automatic selection is what keeps a user from casually hitting the backend's
 * 366-point cap: ≤31 days daily is at most 31 points, ≤26 weeks weekly at most
 * 26, and monthly is unbounded in practice. The manual override is the one
 * place they might, and that is where the 422 copy earns its place.
 */
export function bucketFor(from: Date, to: Date): MetricBucket {
  const days = Math.ceil((to.getTime() - from.getTime()) / DAY_MS);
  if (days <= 31) return "day";
  if (days <= 26 * 7) return "week";
  return "month";
}

/** How many points a range would produce — mirrors the backend's cap check. */
export function bucketCount(from: Date, to: Date, bucket: MetricBucket): number {
  const days = (to.getTime() - from.getTime()) / DAY_MS;
  const per = bucket === "day" ? 1 : bucket === "week" ? 7 : 28;
  return Math.ceil(days / per);
}

export function exceedsCap(from: Date, to: Date, bucket: MetricBucket): boolean {
  return bucketCount(from, to, bucket) > MAX_BUCKETS;
}

function startOfDay(at: Date): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

/** `YYYY-MM-DD`, the value shape a native `<input type="date">` uses. */
export function toDateInput(at: Date): string {
  return at.toISOString().slice(0, 10);
}

function parseDateInput(value: string | undefined): Date | null {
  if (!value) return null;
  const at = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(at.getTime()) ? null : at;
}

export function rangeForPreset(preset: PresetId, today: Date): { from: Date; to: Date } {
  // The upper bound is exclusive and sits at tomorrow's boundary, so a ticket
  // created an hour ago is inside the range. A `to` of "now" would drop the
  // rest of today the moment the page rendered.
  const to = new Date(startOfDay(today).getTime() + DAY_MS);
  if (preset === "mtd") {
    return { from: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)), to };
  }
  const days = PRESETS.find((p) => p.id === preset)?.days ?? 30;
  return { from: new Date(to.getTime() - days * DAY_MS), to };
}

/**
 * Read the range out of the URL, falling back to a sane default.
 *
 * Never throws on malformed input: a hand-edited or stale link should render
 * the default dashboard, not an error page.
 */
export function readRange(
  params: Record<string, string | string[] | undefined>,
  now: Date = new Date(),
): Range {
  const single = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const requested = single("preset") as PresetId | undefined;
  const preset: PresetId =
    requested && PRESETS.some((p) => p.id === requested) ? requested : "30d";

  let { from, to } = rangeForPreset(preset === "custom" ? "30d" : preset, now);
  if (preset === "custom") {
    const customFrom = parseDateInput(single("from"));
    const customTo = parseDateInput(single("to"));
    if (customFrom) from = customFrom;
    if (customTo) to = new Date(customTo.getTime() + DAY_MS);
    // An inverted range would 422 at the backend; swapping is the reading the
    // user obviously meant.
    if (from >= to) [from, to] = [to, from];
  }

  const requestedBucket = single("bucket") as MetricBucket | undefined;
  const bucket: MetricBucket =
    requestedBucket && BUCKETS.some((b) => b.id === requestedBucket)
      ? requestedBucket
      : bucketFor(from, to);

  const requestedMetric = single("metric") as MetricSeries | undefined;
  const metric: MetricSeries =
    requestedMetric && SERIES.some((s) => s.id === requestedMetric) ? requestedMetric : "created";

  return { from, to, bucket, metric, preset };
}

/** Restate a range in prose, for the empty state and the caption. */
export function describeRange(range: Range): string {
  const fmt = (at: Date) =>
    at.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  // `to` is exclusive, so the last day shown is the one before it.
  return `${fmt(range.from)} – ${fmt(new Date(range.to.getTime() - DAY_MS))}`;
}

/** Serialise a range back into a query string, preserving the active tab. */
export function rangeToParams(range: Partial<Range> & { tab?: string }): URLSearchParams {
  const params = new URLSearchParams();
  if (range.tab) params.set("tab", range.tab);
  if (range.preset) params.set("preset", range.preset);
  if (range.preset === "custom") {
    if (range.from) params.set("from", toDateInput(range.from));
    if (range.to) params.set("to", toDateInput(new Date(range.to.getTime() - DAY_MS)));
  }
  if (range.bucket) params.set("bucket", range.bucket);
  if (range.metric) params.set("metric", range.metric);
  return params;
}
