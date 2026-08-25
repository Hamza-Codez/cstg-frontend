"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { replaceSlaPolicy } from "@/lib/api/admin";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { getSession } from "@/lib/auth/session";
import type { Priority } from "@/lib/types";

export interface SlaPolicyState {
  error?: string;
  ok?: boolean;
}

const PRIORITIES: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

/** Hours are what an admin thinks in; seconds are what the API takes. */
function hoursToSeconds(hours: number): number {
  return Math.round(hours * 3600);
}

export async function replaceSlaPolicyAction(
  _previous: SlaPolicyState,
  formData: FormData,
): Promise<SlaPolicyState> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const durations = [];
  for (const priority of PRIORITIES) {
    const raw = String(formData.get(`hours_${priority}`) ?? "").trim();
    const hours = Number(raw);
    // Mirrors the backend bounds for fast feedback; the server is authority.
    if (!raw || Number.isNaN(hours) || hours <= 0) {
      return { error: `Enter a response time for ${priority.toLowerCase()}.` };
    }
    durations.push({ priority, seconds: hoursToSeconds(hours) });
  }

  const note = String(formData.get("note") ?? "").trim() || undefined;
  const result = await replaceSlaPolicy(session.token, { durations, note });

  if (!result.ok) {
    if (result.error.code === "UNAUTHENTICATED") redirect("/sign-in");
    if (result.error.code === "STATE_CONFLICT") {
      // Two admins saving at once is exactly what the partial unique index
      // arbitrates. The user does not need to know about indexes (§8).
      return { error: "Another admin just changed this. Refresh to see the latest." };
    }
    if (result.error.code === "BUSINESS_RULE_VIOLATION") return { error: result.error.message };
    if (result.error.code === "FORBIDDEN") return { error: "You don't have access to this." };
    return { error: "Something went wrong on our end. Try again." };
  }

  revalidatePath("/configuration");
  return { ok: true };
}
