/**
 * Status badge. Colour pairs with a text label so colour is never the sole
 * signal (docs/UIUX_FRONTEND.md §9), and the wording follows the audience (§4).
 */

import { Badge } from "@/components/ui/badge";
import type { SignalTone } from "@/components/ui/badge";
import { statusLabel } from "@/lib/labels";
import type { Audience, TicketStatus } from "@/lib/types";

const TONE: Record<TicketStatus, SignalTone> = {
  OPEN: "neutral",
  IN_PROGRESS: "neutral",
  RESOLVED: "on-track",
  CLOSED: "neutral",
};

export function StatusBadge({
  status,
  audience,
  breached,
}: {
  status: TicketStatus;
  audience: Audience;
  breached?: boolean;
}) {
  if (breached) {
    // The one badge allowed a tint (§3.3); wording stays gentle for customers (§4).
    return (
      <Badge tone="overdue">
        {audience === "customer" ? "Taking longer than expected" : "Overdue"}
      </Badge>
    );
  }
  return <Badge tone={TONE[status]}>{statusLabel(status, audience)}</Badge>;
}
