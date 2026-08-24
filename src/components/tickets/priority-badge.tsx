/**
 * Priority badge (docs/UIUX_FRONTEND.md §3.3). Staff-only — priority is hidden
 * from customers entirely (§4), so this component takes no audience.
 */

import { Flag } from "lucide-react";

import { cn } from "@/lib/cn";
import { priorityLabel } from "@/lib/labels";
import type { Priority } from "@/lib/types";

// Priority is not SLA state, so it must not borrow the signalling colours. It
// reads as weight through the icon, keeping status colour free to mean urgency.
const EMPHASIS: Record<Priority, string> = {
  CRITICAL: "text-text",
  HIGH: "text-text",
  MEDIUM: "text-text/70",
  LOW: "text-text/60",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", EMPHASIS[priority])}>
      <Flag aria-hidden className="size-3.5" strokeWidth={1.5} />
      {priorityLabel(priority)}
    </span>
  );
}
