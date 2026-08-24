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
