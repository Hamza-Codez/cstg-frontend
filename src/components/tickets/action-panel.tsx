"use client";

/**
 * Action panel (docs/UIUX_FRONTEND.md §5, §7.2.3).
 *
 * Renders only the transitions that are valid right now — invalid actions are
 * not disabled, they are absent (§1.2). At most one primary CTA is shown; the
 * lifecycle is linear, so there is never more than one forward move anyway.
 */

import { useActionState, useEffect } from "react";

import { transitionAction, type ActionState } from "@/app/actions/staff";
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

  if (options.length === 0) {
    return (
      <p className="text-sm text-text/60">
        {status === "CLOSED"
          ? "This ticket is closed."
          : hasAssignee
            ? "No action available to you right now."
            : "Assign an agent before work can start."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => (
        <form key={option.to} action={formAction}>
          <input type="hidden" name="ticket_id" value={ticketId} />
          <input type="hidden" name="to" value={option.to} />
          <Button type="submit" variant="primary" block disabled={pending}>
            {option.label}
          </Button>
        </form>
      ))}
    </div>
  );
}
