"use client";

/**
 * How new tickets are routed (spec07 frontend §5).
 *
 * Strategy is a radio group, not a select: the three options need explaining
 * and a select hides the explanation behind a click.
 */

import { useActionState, useEffect, useState } from "react";

import { setAssignmentAction, type AdminState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { AssignmentSettings } from "@/lib/types";

const STRATEGIES: Array<{ value: AssignmentSettings["strategy"]; label: string; hint: string }> = [
  {
    value: "MANUAL",
    label: "Manual",
    hint: "Tickets stay unassigned until a dispatcher assigns them.",
  },
  {
    value: "ROUND_ROBIN",
    label: "Round robin",
    hint: "Take turns, skipping anyone at their limit.",
  },
  {
    value: "LEAST_LOADED",
    label: "Least loaded",
    hint: "Give each ticket to whoever has the fewest open tickets.",
  },
];

export function AssignmentSettingsForm({ settings }: { settings: AssignmentSettings }) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    setAssignmentAction,
    {},
  );
  const [strategy, setStrategy] = useState(settings.strategy);
  const { show } = useToast();

  useEffect(() => {
    if (state.error) show(state.error, "error");
    if (state.ok) show("Assignment updated");
  }, [state, show]);

  const manual = strategy === "MANUAL";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-[13px] text-text">Strategy</legend>
        {STRATEGIES.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-sm border border-border bg-surface px-3 py-2"
          >
            <input
              type="radio"
              name="strategy"
              value={option.value}
              checked={strategy === option.value}
              onChange={() => setStrategy(option.value)}
              className="mt-1 cursor-pointer accent-accent"
            />
            <span className="flex flex-col">
              <span className="text-sm text-text">{option.label}</span>
              <span className="text-xs text-text/60">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {/* The only place in v2 where disabling beats hiding: the dependency
          between the two controls IS the information being conveyed. */}
      <label className="flex items-start gap-3 text-sm text-text">
        <input
          type="checkbox"
          name="auto_assign_on_create"
          value="true"
          defaultChecked={settings.auto_assign_on_create}
          disabled={manual}
          className="mt-1 cursor-pointer accent-accent disabled:cursor-not-allowed"
        />
        <span className={manual ? "opacity-60" : undefined}>
          Auto-assign new tickets
          <span className="block text-xs text-text/60">
            New tickets are routed automatically when they arrive. If no agent is
            available they stay unassigned.
          </span>
        </span>
      </label>

      {state.error && (
        <p role="alert" className="text-xs text-overdue">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
