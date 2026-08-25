"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api/client";
import { replacePriorityRules, setAssignmentConfig, updateStaff } from "@/lib/api/admin";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { getSession } from "@/lib/auth/session";
import type { Category, CustomerTier, Priority, PriorityRuleEntry, Role } from "@/lib/types";

export interface AdminState {
  error?: string;
  ok?: boolean;
}

export async function createStaffAction(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "AGENT") as Role;

  if (!email || !name || !password) return { error: "Fill in every field to continue." };
  if (password.length < 8) return { error: "Use at least 8 characters for the password." };

  const result = await apiFetch("/api/v1/users", {
    method: "POST",
    token: session.token,
    body: { email, name, password, role },
  });
  if (!result.ok) {
    return {
      error:
        result.error.code === "FORBIDDEN"
          ? "You don't have access to this."
          : result.error.message,
    };
  }

  revalidatePath("/users");
  return { ok: true };
}

export async function setStaffActiveAction(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const userId = String(formData.get("user_id") ?? "");
  const isActive = String(formData.get("is_active") ?? "") === "true";

  const result = await apiFetch(`/api/v1/users/${userId}`, {
    method: "PATCH",
    token: session.token,
    body: { is_active: isActive },
  });
  if (!result.ok) return { error: result.error.message };

  revalidatePath("/users");
  return { ok: true };
}

export async function savePriorityMatrixAction(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) redirect("/sign-in");

  // The form posts one field per cell, named `tier|category`. Rebuilding the whole
  // grid here matches the endpoint's whole-matrix contract, which exists so the
  // mapping can never be committed partial (SLA_ENGINE.md §2).
  const rules: PriorityRuleEntry[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.includes("|")) continue;
    const [tier, category] = key.split("|");
    rules.push({
      tier: tier as CustomerTier,
      category: category as Category,
      priority: String(value) as Priority,
    });
  }

  const result = await replacePriorityRules(session.token, rules);
  if (!result.ok) {
    return {
      error:
        result.error.code === "BUSINESS_RULE_VIOLATION"
          ? result.error.message
          : "Could not save the matrix. Try again.",
    };
  }

  revalidatePath("/configuration");
  return { ok: true };
}

/**
 * Capacity and automation opt-out (spec07 frontend §4).
 *
 * Sends only these two fields, so the PATCH cannot accidentally change
 * activation — the backend update is partial for exactly that reason.
 */
export async function updateStaffAction(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const userId = String(formData.get("user_id") ?? "");
  const raw = String(formData.get("max_open_tickets") ?? "").trim();
  // Blank clears the ceiling — "no limit" is a real setting, not a missing one.
  const maxOpenTickets = raw === "" ? null : Number(raw);
  if (maxOpenTickets !== null && (Number.isNaN(maxOpenTickets) || maxOpenTickets < 1)) {
    return { error: "A ticket limit must be 1 or more, or blank for no limit." };
  }

  const result = await updateStaff(session.token, userId, {
    max_open_tickets: maxOpenTickets,
    accepts_auto_assignment: formData.get("accepts_auto_assignment") === "true",
  });
  if (!result.ok) {
    if (result.error.code === "UNAUTHENTICATED") redirect("/sign-in");
    return { error: result.error.message };
  }

  revalidatePath("/users");
  return { ok: true };
}

/** Strategy and the auto-assign switch (spec07 frontend §5). */
export async function setAssignmentAction(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const result = await setAssignmentConfig(session.token, {
    strategy: String(formData.get("strategy") ?? "MANUAL") as
      | "MANUAL"
      | "ROUND_ROBIN"
      | "LEAST_LOADED",
    auto_assign_on_create: formData.get("auto_assign_on_create") === "true",
  });
  if (!result.ok) {
    if (result.error.code === "UNAUTHENTICATED") redirect("/sign-in");
    return { error: result.error.message };
  }

  revalidatePath("/configuration");
  return { ok: true };
}
