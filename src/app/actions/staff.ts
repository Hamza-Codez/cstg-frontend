"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { addComment, assignTicket, claimTicket, transitionTicket } from "@/lib/api/tickets";
import { getSession } from "@/lib/auth/session";
import type { CommentType, TicketStatus } from "@/lib/types";

export interface ClaimState {
  error?: string;
  /** Lost the race — information, not an error. */
  taken?: string;
  ok?: boolean;
}

export interface ActionState {
  error?: string;
  ok?: boolean;
}

/** Error copy mapped from the taxonomy in docs/UIUX_FRONTEND.md §8. */
function messageFor(code: string, fallback: string): string {
  switch (code) {
    case "FORBIDDEN":
      return "You don't have access to this.";
    case "NOT_FOUND":
      return "This ticket couldn't be found.";
    case "STATE_CONFLICT":
      return "This ticket was just updated by someone else. Refresh to see the latest.";
    case "BUSINESS_RULE_VIOLATION":
      return fallback;
    case "INTERNAL_ERROR":
      return "Something went wrong on our end. Try again.";
    default:
      return fallback;
  }
}

import { assertSameOrigin } from "@/lib/auth/csrf";

export async function transitionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const ticketId = String(formData.get("ticket_id") ?? "");
  const to = String(formData.get("to") ?? "") as TicketStatus;

  const result = await transitionTicket(session.token, ticketId, to);
  if (!result.ok) {
    return { error: messageFor(result.error.code, result.error.message) };
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/queue");
  return { ok: true };
}

export async function assignAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const ticketId = String(formData.get("ticket_id") ?? "");
  const assigneeId = String(formData.get("assignee_id") ?? "");
  const overrideCapacity = formData.get("override_capacity") === "true";
  if (!assigneeId) return { error: "Choose an agent to assign this to." };

  const result = await assignTicket(session.token, ticketId, assigneeId, overrideCapacity);
  if (!result.ok) {
    return {
      error: messageFor(result.error.code, "That agent can't take this ticket."),
    };
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/unassigned");
  return { ok: true };
}

export async function commentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const ticketId = String(formData.get("ticket_id") ?? "");
  const type = String(formData.get("type") ?? "PUBLIC_REPLY") as CommentType;
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write something before sending." };

  const result = await addComment(session.token, ticketId, { type, body });
  if (!result.ok) {
    return { error: messageFor(result.error.code, result.error.message) };
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath(`/requests/${ticketId}`);
  return { ok: true };
}

/**
 * An agent takes an unassigned ticket (spec07 frontend §2).
 *
 * A 409 here is the NORMAL outcome of two agents scanning the same queue, so it
 * comes back as `taken` rather than `error` — the caller shows it as
 * information, not failure.
 */
export async function claimAction(
  _previous: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const ticketId = String(formData.get("ticket_id") ?? "");
  const result = await claimTicket(session.token, ticketId);

  if (!result.ok) {
    if (result.error.code === "UNAUTHENTICATED") redirect("/sign-in");
    if (result.error.code === "STATE_CONFLICT") {
      return { taken: "Someone else just took this one." };
    }
    if (result.error.code === "BUSINESS_RULE_VIOLATION") {
      // Names the actual limit, so the agent knows what to do about it.
      return { error: result.error.message };
    }
    return { error: messageFor(result.error.code, result.error.message) };
  }

  revalidatePath("/queue");
  revalidatePath(`/tickets/${ticketId}`);
  return { ok: true };
}
