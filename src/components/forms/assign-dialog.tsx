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
import { Combobox } from "@/components/ui/combobox";
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

  const [chosen, setChosen] = useState<string | null>(currentAssigneeId ?? null);
  const label = currentAssigneeId ? ACTIONS.reassign : ACTIONS.assign;

  /** Absent or null both mean "no ceiling" — the fields carry defaults, so the
   *  generated type makes them optional as well as nullable. */
  function ceiling(agent: UserSummary): number | null {
    return agent.max_open_tickets ?? null;
  }

  function openCount(agent: UserSummary): number {
    return agent.open_ticket_count ?? 0;
  }

  function atCapacity(agent: UserSummary): boolean {
    const cap = ceiling(agent);
    return cap !== null && openCount(agent) >= cap;
  }

  const selected = agents.find((a) => a.id === chosen) ?? null;
  const needsOverride = selected !== null && atCapacity(selected);

  /**
   * Load as TEXT and a bar. Colour is never the sole signal (§9), so the number
   * carries the meaning and the bar reinforces it.
   *
   * The bar uses `structure` — load is not SLA health, so it must not borrow
   * on-track/at-risk/overdue.
   */
  const options = agents.map((agent) => ({
    value: agent.id,
    label: agent.name,
    hint:
      ceiling(agent) === null
        ? `${openCount(agent)} open`
        : `${openCount(agent)} / ${ceiling(agent)} open`,
    // Selectable, but marked: removing a full agent would hide the person a
    // dispatcher may need during an incident, and the backend supports an
    // explicit override.
    flagged: atCapacity(agent),
    flagLabel: "At limit",
  }));

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
            <input type="hidden" name="assignee_id" value={chosen ?? ""} />
            <Combobox
              label="Agent"
              options={options}
              value={chosen}
              onChange={setChosen}
              placeholder="Search agents…"
              emptyMessage="No agents match."
            />

            {selected && (
              <p className="text-xs text-text/60">
                {openCount(selected)} open
                {ceiling(selected) !== null && ` of ${ceiling(selected)}`}
                {/* Reinforcement, not the signal itself. */}
                <span
                  aria-hidden
                  className="ml-2 inline-block h-1 w-24 rounded-full bg-canvas align-middle"
                >
                  <span
                    className="block h-1 rounded-full bg-structure"
                    style={{
                      width: `${Math.min(
                        100,
                        ceiling(selected)
                          ? (openCount(selected) / (ceiling(selected) as number)) * 100
                          : 0,
                      )}%`,
                    }}
                  />
                </span>
              </p>
            )}

            {/* The override is deliberate and per-assignment: capacity is a
                routing heuristic, and a dispatcher handling a CRITICAL outage
                must be able to say "anyway" (spec07 §6). */}
            {needsOverride && (
              <label className="flex items-start gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  name="override_capacity"
                  value="true"
                  className="mt-1 cursor-pointer accent-accent"
                />
                <span>
                  Assign anyway (over their limit)
                  <span className="block text-xs text-text/60">
                    Recorded on the ticket&apos;s history.
                  </span>
                </span>
              </label>
            )}
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={pending || !chosen}>
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
