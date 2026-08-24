/**
 * Status and priority badges (docs/UIUX_FRONTEND.md §3.3).
 *
 * A small coloured dot plus a label — never a full colour fill, which would let
 * status compete with the accent. Overdue is the single badge allowed a tint.
 * The dot is decorative: the label always carries the meaning, so colour is
 * never the sole signal.
 */

import { cn } from "@/lib/cn";

export type SignalTone = "neutral" | "on-track" | "at-risk" | "overdue";

const DOT: Record<SignalTone, string> = {
  neutral: "bg-structure",
  "on-track": "bg-on-track",
  "at-risk": "bg-at-risk",
  overdue: "bg-overdue",
};

export interface BadgeProps {
  children: string;
  tone?: SignalTone;
  /** Hide the dot for badges that carry no state (e.g. category). */
  showDot?: boolean;
}

export function Badge({ children, tone = "neutral", showDot = true }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs",
        tone === "overdue" ? "bg-overdue/10 text-overdue" : "bg-canvas text-text",
      )}
    >
      {showDot && <span aria-hidden className={cn("size-1.5 rounded-sm", DOT[tone])} />}
      {children}
    </span>
  );
}
