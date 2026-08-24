"use client";

/**
 * Priority matrix grid (docs/UIUX_FRONTEND.md §7.4.2).
 *
 * Every cell is always rendered and always submitted, even unchanged ones — the
 * endpoint takes the whole matrix so it can verify totality in one transaction
 * (SLA_ENGINE.md §2). A partial save is not a thing this screen can express.
 */

import { useActionState, useEffect } from "react";

import { savePriorityMatrixAction, type AdminState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { categoryLabel, priorityLabel, tierLabel } from "@/lib/labels";
import type { Category, CustomerTier, Priority, PriorityRuleEntry } from "@/lib/types";

const TIERS: CustomerTier[] = ["ENTERPRISE", "BUSINESS", "FREE"];
const CATEGORIES: Category[] = ["OUTAGE", "BILLING", "TECHNICAL", "GENERAL"];
const PRIORITIES: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export function PriorityMatrix({ rules }: { rules: PriorityRuleEntry[] }) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    savePriorityMatrixAction,
    {},
  );
  const { show } = useToast();

  useEffect(() => {
    if (state.error) show(state.error, "error");
    if (state.ok) show("Matrix saved");
  }, [state, show]);

  const lookup = new Map(rules.map((r) => [`${r.tier}|${r.category}`, r.priority]));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Priority by plan and category</caption>
          <thead className="bg-structure text-text-inverse">
            <tr>
              <th scope="col" className="px-4 py-2 text-xs font-medium">
                Plan
              </th>
              {CATEGORIES.map((category) => (
                <th key={category} scope="col" className="px-4 py-2 text-xs font-medium">
                  {categoryLabel(category)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-surface">
            {TIERS.map((tier) => (
              <tr key={tier} className="border-t border-border">
                <th scope="row" className="px-4 py-3 text-sm font-medium text-text">
                  {tierLabel(tier)}
                </th>
                {CATEGORIES.map((category) => {
                  const key = `${tier}|${category}`;
                  return (
                    <td key={key} className="px-4 py-3">
                      <select
                        name={key}
                        aria-label={`${tierLabel(tier)}, ${categoryLabel(category)}`}
                        defaultValue={lookup.get(key) ?? "MEDIUM"}
                        className="w-full cursor-pointer rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {priorityLabel(p)}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : "Save matrix"}
        </Button>
        <p className="text-xs text-text/60">
          Changes apply to new tickets only — priority and the SLA deadline are frozen when a
          ticket is created.
        </p>
      </div>
    </form>
  );
}
