"use client";

/** Create staff (docs/UIUX_FRONTEND.md §7.4.3). */

import { useActionState, useEffect, useState } from "react";

import {
  createStaffAction,
  deleteStaffAction,
  setStaffActiveAction,
  updateStaffAction,
  type AdminState,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
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
    // `autoComplete="off"` on the form and per field. Browsers otherwise fill
    // the SIGNED-IN ADMIN's own email and password here, because it looks like
    // a login form — and submitting that silently creates a second staff
    // account with the admin's credentials. `new-password` on the password
    // field is the part Chrome actually honours; `off` alone it ignores.
    <form
      action={formAction}
      autoComplete="off"
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <Input label="Name" name="name" autoComplete="off" required />
      </div>
      <div className="flex-1">
        <Input label="Email" name="email" type="email" autoComplete="off" required />
      </div>
      <div className="flex-1">
        <Input
          label="Temporary password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
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

/**
 * Capacity and automation opt-out for one agent (spec07 frontend §4).
 *
 * `accepts_auto_assignment` governs the AUTOMATIC path only — a dispatcher
 * assigning by hand has already made the decision the flag exists to defer — so
 * the label says what it does rather than repeating the field name.
 */
export function AgentRouting({
  userId,
  maxOpenTickets,
  acceptsAutoAssignment,
}: {
  userId: string;
  maxOpenTickets: number | null;
  acceptsAutoAssignment: boolean;
}) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    updateStaffAction,
    {},
  );
  const { show } = useToast();

  useEffect(() => {
    if (state.error) show(state.error, "error");
    if (state.ok) show("Saved");
  }, [state, show]);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="user_id" value={userId} />
      <label className="flex items-center gap-2 text-sm text-text">
        <span className="sr-only">Ticket limit</span>
        <input
          type="number"
          name="max_open_tickets"
          min={1}
          defaultValue={maxOpenTickets ?? ""}
          // Blank means unlimited. An empty numeric field otherwise reads as
          // unset-and-broken, so the placeholder says so.
          placeholder="No limit"
          className="w-24 rounded-sm border border-border bg-surface px-2 py-1 text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          name="accepts_auto_assignment"
          value="true"
          defaultChecked={acceptsAutoAssignment}
          className="cursor-pointer accent-accent"
        />
        Include in automatic assignment
      </label>
      <Button type="submit" variant="secondary" disabled={pending}>
        Save
      </Button>
    </form>
  );
}

/**
 * Delete a staff member outright.
 *
 * Deliberately narrower than Deactivate, and secondary to it: deactivation is
 * the right answer for someone who has left, because their history stays
 * attached to them. Deletion only succeeds for a row that never acted — the
 * account created by a typo — and the backend enforces that, naming what the
 * person touched when it refuses.
 *
 * Confirms first. It is irreversible and sits next to a button people click
 * routinely, which is exactly when a misclick happens.
 */
export function DeleteStaff({
  userId,
  name,
  isSelf,
}: {
  userId: string;
  name: string;
  isSelf: boolean;
}) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    deleteStaffAction,
    {},
  );
  const [confirming, setConfirming] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    if (state.error) {
      // The backend's sentence explains the refusal and names the alternative.
      show(state.error, "error");
      setConfirming(false);
    }
    if (state.ok) show(`${name} deleted`);
  }, [state, show, name]);

  // Deleting your own row logs you out, and if you are the last admin there is
  // no way back in through the UI. Same guard as the activate toggle.
  if (isSelf) return null;

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setConfirming(true)}
        disabled={pending}
        className="text-sm"
      >
        Delete
      </Button>

      <Modal open={confirming} onClose={() => setConfirming(false)} title={`Delete ${name}?`}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text">
            This removes the account entirely and cannot be undone. It only works if they have
            never been assigned a ticket, written a comment, or changed a setting — if they have,
            deactivate them instead so their history stays intact.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <form action={formAction}>
              <input type="hidden" name="user_id" value={userId} />
              <Button type="submit" variant="danger" disabled={pending}>
                {pending ? "Deleting…" : "Delete"}
              </Button>
            </form>
          </div>
        </div>
      </Modal>
    </>
  );
}
