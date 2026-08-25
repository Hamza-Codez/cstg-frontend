"use server";

import { revalidatePath } from "next/cache";

import { assertSameOrigin } from "@/lib/auth/csrf";
import { getSession } from "@/lib/auth/session";
import { createSavedView, deleteSavedView } from "@/lib/api/saved-views";
import { parseFilters } from "@/lib/filters";

export interface SavedViewState {
  error?: string;
  ok?: boolean;
}

export async function createSavedViewAction(
  _previous: SavedViewState,
  formData: FormData,
): Promise<SavedViewState> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) return { error: "Your session has expired. Sign in again." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give this view a name." };

  // The query string is the source of truth for what is being saved, parsed
  // through the same helper the bar uses so an invalid value cannot be stored.
  const query = String(formData.get("query") ?? "");
  const filters = parseFilters(Object.fromEntries(new URLSearchParams(query)));

  const result = await createSavedView(session.token, { name, filters });
  if (!result.ok) {
    if (result.error.code === "BUSINESS_RULE_VIOLATION") {
      return { error: "You already have a view with that name." };
    }
    if (result.error.code === "FORBIDDEN") {
      return { error: "This view uses a filter your role can't save." };
    }
    return { error: "Something went wrong on our end. Try again." };
  }

  revalidatePath("/tickets");
  return { ok: true };
}

export async function deleteSavedViewAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) return;

  await deleteSavedView(session.token, String(formData.get("id") ?? ""));
  revalidatePath("/tickets");
}
