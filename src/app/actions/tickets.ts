"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createTicket } from "@/lib/api/tickets";
import { getSession } from "@/lib/auth/session";
import type { Category } from "@/lib/types";

export interface NewRequestState {
  error?: string;
  fieldErrors?: { subject?: string; body?: string };
}

/** Mirrors the backend's TicketCreate bounds for fast feedback; server is authority. */
const SUBJECT_MAX = 200;
const BODY_MAX = 10000;

import { assertSameOrigin } from "@/lib/auth/csrf";

export async function createRequestAction(
  _previous: NewRequestState,
  formData: FormData,
): Promise<NewRequestState> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const category = String(formData.get("category") ?? "") as Category;

  const fieldErrors: NewRequestState["fieldErrors"] = {};
  if (!subject) fieldErrors.subject = "Give your request a short title.";
  else if (subject.length > SUBJECT_MAX) fieldErrors.subject = `Keep this under ${SUBJECT_MAX} characters.`;
  if (!body) fieldErrors.body = "Describe what is happening.";
  else if (body.length > BODY_MAX) fieldErrors.body = `Keep this under ${BODY_MAX} characters.`;
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const result = await createTicket(session.token, { subject, body, category });
  if (!result.ok) {
    if (result.error.code === "UNAUTHENTICATED") redirect("/sign-in");
    return { error: result.error.message };
  }

  revalidatePath("/requests");
  // Straight to the new request so the flow confirms inline, never a dead end (§7.1.4).
  redirect(`/requests/${result.data.id}`);
}
