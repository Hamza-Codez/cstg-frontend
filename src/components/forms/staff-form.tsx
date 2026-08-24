"use client";

/** Create staff (docs/UIUX_FRONTEND.md §7.4.3). */

import { useActionState, useEffect } from "react";

import { createStaffAction, setStaffActiveAction, type AdminState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export function StaffForm() {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    createStaffAction,
    {},
  );
  const { show } = useToast();

  useEffect(() => {
    if (state.error) show(state.error, "error");
    if (state.ok) show("Staff member added");
  }, [state, show]);

  return (
    <form action={formAction} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex-1"><Input label="Name" name="name" required /></div>
      <div className="flex-1"><Input label="Email" name="email" type="email" required /></div>
      <div className="flex-1">
        <Input label="Temporary password" name="password" type="password" minLength={8} required />
      </div>
      <div className="sm:w-40">
        <Field label="Role" htmlFor="role" required>
          <select
            id="role"
            name="role"
            defaultValue="AGENT"
            className="cursor-pointer rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          >
            <option value="AGENT">Agent</option>
            <option value="DISPATCHER">Dispatcher</option>
            <option value="ADMIN">Admin</option>
          </select>
        </Field>
      </div>
      <Button type="submit" variant="primary" disabled={pending}>
        Add staff
      </Button>
    </form>
  );
}

export function ActiveToggle({
  userId,
  isActive,
  isSelf,
}: {
  userId: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    setStaffActiveAction,
    {},
  );
  const { show } = useToast();

  useEffect(() => {
    if (state.error) show(state.error, "error");
    if (state.ok) show(isActive ? "Deactivated" : "Activated");
  }, [state, show, isActive]);

  if (isSelf) {
    // Locking yourself out of your own admin account is unrecoverable from the UI.
    return <span className="text-xs text-text/50">That&apos;s you</span>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="is_active" value={String(!isActive)} />
      <Button
        type="submit"
        disabled={pending}
        variant={isActive ? "danger" : "neutral"}
        className="text-sm"
      >
        {isActive ? "Deactivate" : "Activate"}
      </Button>
    </form>
  );
}
