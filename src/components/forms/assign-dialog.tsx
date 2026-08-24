"use client";

/**
 * Assign / reassign (docs/UIUX_FRONTEND.md §7.3.2).
 *
 * The picker is fed only active AGENTs, so the choices on offer already satisfy
 * INV-8 — the backend still re-checks, but the UI never presents a target it
 * knows would be rejected.
 */

import { useActionState, useEffect, useState } from "react";

import { assignAction, type ActionState } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ACTIONS } from "@/lib/labels";
import type { UserSummary } from "@/lib/types";

export function AssignDialog({
  ticketId,
  agents,
  currentAssigneeId,
}: {
  ticketId: string;
  agents: UserSummary[];
  currentAssigneeId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(assignAction, {});
  const { show } = useToast();

  useEffect(() => {
    if (state.error) show(state.error, "error");
    if (state.ok) {
      show("Assigned");
      setOpen(false);
    }
  }, [state, show]);

  const label = currentAssigneeId ? ACTIONS.reassign : ACTIONS.assign;

  return (
    <>
      <Button variant={currentAssigneeId ? "secondary" : "primary"} block onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={label}>
        {agents.length === 0 ? (
          <p className="text-sm text-text/60">
            No active agents are available to take this ticket.
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="ticket_id" value={ticketId} />
            <Field label="Agent" htmlFor="assignee_id" required>
              <select
                id="assignee_id"
                name="assignee_id"
                defaultValue={currentAssigneeId ?? ""}
                className="cursor-pointer rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
              >
                <option value="">Choose an agent…</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={pending}>
                {label}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {ACTIONS.cancel}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
