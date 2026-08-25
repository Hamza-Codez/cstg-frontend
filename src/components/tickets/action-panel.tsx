"use client";

/**
 * Action panel (docs/UIUX_FRONTEND.md §5, §7.2.3).
 *
 * Renders only the transitions that are valid right now — invalid actions are
 * not disabled, they are absent (§1.2).
 *
 * The lifecycle stopped being linear at P16: from IN_PROGRESS an agent can
 * resolve *or* wait on the customer. At most one primary CTA is still shown
 * (§3.1) — the option marked `primary` — and any others render secondary.
 */

import { useActionState, useEffect } from "react";

import { transitionAction, type ActionState } from "@/app/actions/staff";
import { ClaimButton } from "@/components/tickets/claim-button";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { availableTransitions } from "@/lib/transitions";
import type { Role, TicketStatus } from "@/lib/types";

export function ActionPanel({
  ticketId,
  status,
  role,
  hasAssignee,
  isAssignedToMe,
}: {
  ticketId: string;
  status: TicketStatus;
  role: Role;
  hasAssignee: boolean;
  isAssignedToMe: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    transitionAction,
    {},
  );
  const { show } = useToast();

  useEffect(() => {
    if (state.error) show(state.error, "error");
  }, [state.error, show]);

  const options = availableTransitions(status, role, { hasAssignee, isAssignedToMe });

  // Claim sits above the transitions because it is their prerequisite: T1
  // requires an assignee (spec07 frontend §2).
  const canClaim = !hasAssignee && (role === "AGENT" || role === "ADMIN");

  if (options.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {canClaim && <ClaimButton ticketId={ticketId} block />}
        <p className="text-sm text-text/60">
        {status === "CLOSED"
          ? "This ticket is closed."
          : hasAssignee
            ? "No action available to you right now."
            : canClaim
              ? "Take this ticket to start working on it."
              : "Assign an agent before work can start."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {canClaim && <ClaimButton ticketId={ticketId} block />}
      {options.map((option) => (
        <form key={option.to} action={formAction}>
          <input type="hidden" name="ticket_id" value={ticketId} />
          <input type="hidden" name="to" value={option.to} />
          <Button
            type="submit"
            variant={option.primary ? "primary" : "secondary"}
            block
            disabled={pending}
          >
            {option.label}
          </Button>
        </form>
      ))}
    </div>
  );
}
