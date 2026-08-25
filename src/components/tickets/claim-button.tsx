"use client";

/**
 * Claim (spec07 frontend §2).
 *
 * Used in two places: the detail action panel, and inline on each row of the
 * agent's unassigned queue. The queue is the flow that matters — an agent
 * scanning for work should not have to open a ticket to take it.
 */

import { useActionState, useEffect } from "react";

import { claimAction, type ClaimState } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ClaimButton({
  ticketId,
  block = false,
}: {
  ticketId: string;
  /** Full width in the detail action panel; compact in a table row. */
  block?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ClaimState, FormData>(claimAction, {});
  const { show } = useToast();

  useEffect(() => {
    if (state.ok) show("Ticket is yours");
    // Losing the race is the normal outcome of two agents scanning one queue,
    // so it is shown as information rather than with the error variant.
    if (state.taken) show(state.taken);
    if (state.error) show(state.error, "error");
  }, [state, show]);

  return (
    <form action={formAction}>
      <input type="hidden" name="ticket_id" value={ticketId} />
      {/* Secondary, not primary: on the detail panel the transition buttons own
          the primary slot (§3.1). */}
      <Button type="submit" variant="secondary" block={block} disabled={pending}>
        {pending ? "Taking…" : "Take this ticket"}
      </Button>
    </form>
  );
}
