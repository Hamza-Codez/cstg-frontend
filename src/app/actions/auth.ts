"use server";

/**
 * Auth Server Actions.
 *
 * The JWT never reaches the browser: the token goes straight from the API into
 * an httpOnly cookie on the server (docs/FRONTEND_STRUCTURE.md §5).
 */

import { redirect } from "next/navigation";

import { landingFor } from "@/config/nav";
import { apiFetch } from "@/lib/api/client";
import { setSession } from "@/lib/auth/session";
import type { ActorType, Role, TokenResponse } from "@/lib/types";

export interface SignInState {
  error?: string;
}

import { assertSameOrigin } from "@/lib/auth/csrf";

export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  await assertSameOrigin();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const result = await apiFetch<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });

  if (!result.ok) {
    // Never distinguish "no such account" from "wrong password" — that would
    // turn the sign-in form into an account-enumeration oracle.
    const message =
      result.error.status === 0
        ? "Could not reach the server. Try again."
        : "That email and password do not match.";
    return { error: message };
  }

  const { access_token, role, principal_type, principal_id } = result.data;
  await setSession({
    token: access_token,
    role: role as Role,
    principalType: principal_type as ActorType,
    principalId: principal_id,
  });

  redirect(landingFor(role as Role));
}

// Sign-out lives in the /sign-out route handler, not here: a route URL survives
// a rebuild, while a Server Action id does not.
