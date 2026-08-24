"use client";

/**
 * The customer's two lifecycle actions (spec05 frontend §5).
 *
 * Exactly two, and both narrow: answering "we're waiting on you" and answering
 * "we think this is fixed". There is deliberately no Start, Resolve or Close
 * here — a customer may never assert that work was done.
 */

import { useActionState, useEffect, useState } from "react";

import { reopenRequestAction, type ReopenState } from "@/app/actions/customers";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { TicketStatus } from "@/lib/types";

export function CustomerActions({
  ticketId,
  status,
}: {
  ticketId: string;
  status: TicketStatus;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ReopenState, FormData>(
    reopenRequestAction,
    {},
  );

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  // Paused: the customer's job is to answer, not to operate a state machine.
  // Replying resumes the clock server-side inside the reply's transaction, so
  // there is no button here — only the reason the composer is waiting.
  if (status === "PENDING_CUSTOMER") {
    return (
      <p className="rounded-sm border border-at-risk bg-surface px-3 py-2 text-sm text-text">
        Support is waiting for your reply. Send a message below and we&apos;ll pick it straight
        back up.
      </p>
    );
  }

  if (status !== "RESOLVED") return null;

  return (
    <div className="flex flex-col gap-2">
      {/* Copy is the customer's words, not ours — "Reopen" is internal
          vocabulary (docs/UIUX_FRONTEND.md §4). */}
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        This isn&apos;t fixed
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="What's still wrong?">
        <form action={formAction} className="flex flex-col gap-3 p-4">
          <input type="hidden" name="ticket_id" value={ticketId} />
          <label className="flex flex-col gap-1 text-sm text-text">
            Tell us what&apos;s still happening
            <textarea
              name="reason"
              rows={4}
              required
              maxLength={10000}
              autoFocus
              className="rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            />
          </label>
          <p className="text-xs text-text/60">
            We&apos;ll pick this request back up and reply to you here.
          </p>
          {state.error && (
            <p role="alert" className="text-xs text-overdue">
              {state.error}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Sending…" : "Send"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
