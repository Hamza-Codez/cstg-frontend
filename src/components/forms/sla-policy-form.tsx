"use client";

/**
 * SLA durations (spec06 frontend §3).
 *
 * Editing these looks like it changes existing commitments. It does not —
 * deadlines are frozen at creation and pinned to a policy version. A user who
 * does not know that will either avoid this screen or expect a retroactive
 * effect that never comes, so the rule is stated *above* the form, not after.
 */

import { useActionState, useEffect, useState } from "react";

import { replaceSlaPolicyAction, type SlaPolicyState } from "@/app/actions/sla-policy";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { priorityLabel } from "@/lib/labels";
import type { Priority, SlaDurationEntry } from "@/lib/types";

/** Fastest first, so the ladder reads top to bottom. */
const ORDER: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function toHours(seconds: number): string {
  const hours = seconds / 3600;
  // Sub-hour targets are real, so fractions survive rather than rounding to 0.
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/\.?0+$/, "");
}

export function SlaPolicyForm({ durations }: { durations: SlaDurationEntry[] }) {
  const [state, formAction, pending] = useActionState<SlaPolicyState, FormData>(
    replaceSlaPolicyAction,
    {},
  );
  const { show } = useToast();

  useEffect(() => {
    if (state.ok) show("Response times updated");
  }, [state.ok, show]);

  const bySeconds = new Map(durations.map((d) => [d.priority, d.seconds]));

  const [hours, setHours] = useState<Record<Priority, number>>(() =>
    Object.fromEntries(
      ORDER.map((p) => [p, (bySeconds.get(p) ?? 0) / 3600]),
    ) as Record<Priority, number>,
  );

  /**
   * A ladder where a lower priority is faster than a higher one.
   *
   * Warned, never blocked: the backend permits it and there are real reasons
   * for an unusual ladder. Blocking would be the UI inventing a rule the server
   * does not have (spec01 §2).
   */
  const inversions = ORDER.flatMap((priority, index) =>
    ORDER.slice(index + 1)
      .filter((lower) => hours[lower] > 0 && hours[priority] > hours[lower])
      .map((lower) => `${priorityLabel(priority)} is slower than ${priorityLabel(lower)}`),
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* The single most important string on this page. Mirrors the note the
          priority matrix already carries (docs/API.md §11). */}
      <p className="rounded-sm border border-at-risk bg-surface px-3 py-2 text-sm text-text">
        Changes apply to new tickets only. Tickets already open keep the response
        times they were created under.
      </p>

      <div className="flex flex-col gap-2">
        {ORDER.map((priority) => (
          <label key={priority} className="flex items-center gap-3 text-sm text-text">
            <span className="w-24 font-medium">{priorityLabel(priority)}</span>
            <input
              type="number"
              name={`hours_${priority}`}
              defaultValue={toHours(bySeconds.get(priority) ?? 0)}
              min={0.01}
              step={0.25}
              required
              onChange={(event) =>
                setHours((current) => ({
                  ...current,
                  [priority]: Number(event.target.value),
                }))
              }
              className="w-28 rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            />
            {/* Hours are what an admin thinks in. A form demanding 7200 invites
                a wrong-by-60x typo; the action converts. */}
            <span className="text-xs text-text/60">hours</span>
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm text-text">
        Note (optional)
        <input
          name="note"
          maxLength={200}
          placeholder="Q3 enterprise terms"
          className="rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        />
        <span className="text-xs text-text/60">
          Shown in history — the difference between a useful audit and a list of dates.
        </span>
      </label>

      {inversions.length > 0 && (
        <p className="text-xs text-at-risk">
          {inversions.join("; ")}. Is that intended?
        </p>
      )}

      {state.error && (
        <p role="alert" className="text-xs text-overdue">
          {state.error}
        </p>
      )}

      {/* One button for the group: the backend requires a total policy, and a
          per-row save would pass through states that are not. */}
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
