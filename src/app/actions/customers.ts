"use server";

import { redirect } from "next/navigation";

import { landingFor } from "@/config/nav";
import { apiFetch } from "@/lib/api/client";
import { setSession } from "@/lib/auth/session";
import type { ActorType, CustomerResponse, Role, TokenResponse } from "@/lib/types";

export interface SignUpState {
  error?: string;
}

const MIN_PASSWORD = 8;

import { assertSameOrigin } from "@/lib/auth/csrf";

export async function signUpAction(
  _previous: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  await assertSameOrigin();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!email || !password || !name) return { error: "Fill in every field to continue." };
  if (password.length < MIN_PASSWORD) {
    return { error: `Use at least ${MIN_PASSWORD} characters for your password.` };
  }

  const created = await apiFetch<CustomerResponse>("/api/v1/customers", {
    method: "POST",
    body: { email, password, name },
  });
  if (!created.ok) {
    return {
      error:
        created.error.status === 0
          ? "Could not reach the server. Try again."
          : created.error.message,
    };
  }

  // Sign in immediately: making someone re-enter what they just typed is friction
  // for nothing (§7.1 — onboard to first screen without a dead end).
  const login = await apiFetch<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (!login.ok) redirect("/sign-in");

  await setSession({
    token: login.data.access_token,
    role: login.data.role as Role,
    principalType: login.data.principal_type as ActorType,
    principalId: login.data.principal_id,
  });
  redirect(landingFor(login.data.role as Role));
}

// ── Reopen (T6) ──────────────────────────────────────────────────────────────

export interface ReopenState {
  error?: string;
  ok?: boolean;
}

/**
 * A customer reopening their own resolved request (spec05 frontend §5).
 *
 * Transition first, then post the explanation. Ordered that way because the
 * transition is the step that can legitimately fail — outside the reopen window
 * the backend returns 422 — and failing it first means no orphaned reply on a
 * ticket that stayed resolved.
 *
 * The explanation is required: a reopen with no reason is a ticket an agent has
 * to chase.
 */
export async function reopenRequestAction(
  _previous: ReopenState,
  formData: FormData,
): Promise<ReopenState> {
  await assertSameOrigin();
  const { getSession } = await import("@/lib/auth/session");
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const ticketId = String(formData.get("ticket_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Tell us what's still wrong." };

  const { addComment, transitionTicket } = await import("@/lib/api/tickets");

  const reopened = await transitionTicket(session.token, ticketId, "IN_PROGRESS");
  if (!reopened.ok) {
    if (reopened.error.code === "UNAUTHENTICATED") redirect("/sign-in");
    // The window rule lives on the backend and its message names the actual
    // limit, so it is surfaced verbatim rather than paraphrased here.
    if (reopened.error.code === "BUSINESS_RULE_VIOLATION") {
      return { error: reopened.error.message };
    }
    if (reopened.error.code === "STATE_CONFLICT") {
      return { error: "This request was just updated. Refresh to see the latest." };
    }
    return { error: "Something went wrong on our end. Try again." };
  }

  const replied = await addComment(session.token, ticketId, {
    type: "PUBLIC_REPLY",
    body: reason,
  });

  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/requests/${ticketId}`);

  // The reopen succeeded; a failed reply is recoverable through the normal
  // composer, so it is reported without pretending the reopen failed too.
  if (!replied.ok) {
    return { error: "Reopened, but your message didn't send. Please add it below." };
  }
  return { ok: true };
}
