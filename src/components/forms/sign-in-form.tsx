"use client";

/**
 * Sign-in form (docs/UIUX_FRONTEND.md §7.1): one screen, minimal fields.
 * Client Component because it owns pending state and inline errors.
 */

import { useActionState } from "react";

import { signInAction, type SignInState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACTIONS } from "@/lib/labels";

export function SignInForm() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signInAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input label="Email" name="email" type="email" autoComplete="email" required />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {state.error && (
        <p role="alert" className="text-xs text-overdue">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="primary" block disabled={pending}>
        {pending ? "Signing in…" : ACTIONS.signIn}
      </Button>
    </form>
  );
}
