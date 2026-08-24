"use client";

/**
 * New request (docs/UIUX_FRONTEND.md §7.1.3): one screen — subject, category,
 * description. Priority is never shown; the system derives it silently from the
 * customer's plan and category (SLA_ENGINE.md §2).
 */

import { useActionState } from "react";

import { createRequestAction, type NewRequestState } from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ACTIONS } from "@/lib/labels";
import type { Category } from "@/lib/types";

/** Plain choices with a one-line description, not enum names (§4, §7.1.3). */
const CATEGORIES: Array<{ value: Category; label: string; hint: string }> = [
  { value: "OUTAGE", label: "Service is down", hint: "Nothing loads, or the service is unavailable." },
  { value: "BILLING", label: "Billing", hint: "Invoices, payments, or your plan." },
  { value: "TECHNICAL", label: "Technical", hint: "Something is broken or behaving oddly." },
  { value: "GENERAL", label: "General", hint: "Anything else." },
];

export function NewRequestForm() {
  const [state, formAction, pending] = useActionState<NewRequestState, FormData>(
    createRequestAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Input
        label="Subject"
        name="subject"
        required
        maxLength={200}
        hint="A short title, for example “Cannot sign in”."
        error={state.fieldErrors?.subject}
      />

      <Field label="What is this about?" htmlFor="category" required>
        <div className="flex flex-col gap-2">
          {CATEGORIES.map((option, index) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface px-3 py-2"
            >
              <input
                type="radio"
                name="category"
                value={option.value}
                defaultChecked={index === CATEGORIES.length - 1}
                className="mt-1 cursor-pointer accent-accent"
              />
              <span className="flex flex-col">
                <span className="text-sm text-text">{option.label}</span>
                <span className="text-xs text-text/60">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </Field>

      <Field
        label="Description"
        htmlFor="body"
        required
        error={state.fieldErrors?.body}
        hint="What happened, and what you expected instead."
      >
        <textarea
          id="body"
          name="body"
          required
          rows={6}
          maxLength={10000}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        />
      </Field>

      {state.error && (
        <p role="alert" className="text-xs text-overdue">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="primary" block disabled={pending}>
        {pending ? "Sending…" : ACTIONS.send}
      </Button>
    </form>
  );
}
