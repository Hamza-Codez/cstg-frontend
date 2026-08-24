"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { addComment, assignTicket, transitionTicket } from "@/lib/api/tickets";
import { getSession } from "@/lib/auth/session";
import type { CommentType, TicketStatus } from "@/lib/types";

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

export async function transitionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
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
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const ticketId = String(formData.get("ticket_id") ?? "");
  const assigneeId = String(formData.get("assignee_id") ?? "");
  if (!assigneeId) return { error: "Choose an agent to assign this to." };

  const result = await assignTicket(session.token, ticketId, assigneeId);
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
  return { ok: true };
}
