/**
 * Dashboard primitives.
 *
 * Each tile is a hero number with a gradient rule above it — the gradient is
 * decoration on chrome, not on data, so it never encodes a value. Numbers are
 * tabular so a column of them aligns on the digit.
 */

import { cn } from "@/lib/cn";

export type StatAccent = "structure" | "accent" | "overdue" | "on-track";

const BAR: Record<StatAccent, string> = {
  structure: "bg-gradient-structure",
  accent: "bg-gradient-accent",
  overdue: "bg-overdue",
  "on-track": "bg-on-track",
};

export function Stat({
  label,
  value,
  hint,
  accent = "structure",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: StatAccent;
}) {
  return (
    <div className="overflow-hidden rounded-sm border border-border bg-gradient-sidebar shadow-sm">
      {/* The accent color applied as the header background instead of a top line. */}
      <div className={cn("px-4 py-1.5", BAR[accent])}>
        <span className="text-xs font-medium text-text-inverse">{label}</span>
      </div>
      <div className="flex flex-col gap-0.5 px-4 pb-3 pt-2">
        <span className="text-2xl font-medium tabular-nums text-text-inverse">
          {value}
        </span>
        {hint && <span className="text-xs text-text-inverse">{hint}</span>}
      </div>
    </div>
  );
}

export function BarRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-text/70">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-sm bg-canvas">
        <div
          className="h-full rounded-sm bg-structure"
          style={{ width: `${pct}%` }}
          role="presentation"
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-text">{value}</span>
    </div>
  );
}
