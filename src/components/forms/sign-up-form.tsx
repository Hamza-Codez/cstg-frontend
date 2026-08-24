"use client";

/** Sign-up (docs/UIUX_FRONTEND.md §7.1.1): minimal fields, one screen. */

import { useActionState } from "react";

import { signUpAction, type SignUpState } from "@/app/actions/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACTIONS } from "@/lib/labels";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState<SignUpState, FormData>(signUpAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input label="Your name" name="name" autoComplete="name" required />
      <Input label="Email" name="email" type="email" autoComplete="email" required />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        hint="At least 8 characters."
        required
      />
      {state.error && (
        <p role="alert" className="text-xs text-overdue">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="primary" block disabled={pending}>
        {pending ? "Creating…" : ACTIONS.signUp}
      </Button>
    </form>
  );
}
