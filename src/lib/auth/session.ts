/**
 * Session handling: the JWT lives in an httpOnly cookie so it is never readable
 * from JavaScript (docs/FRONTEND_STRUCTURE.md §5 — limits XSS blast radius).
 *
 * Server-only. Importing this from a Client Component is a build error, which is
 * the point: the token must not reach the browser bundle.
 */

import "server-only";

import { cookies } from "next/headers";

import type { ActorType, Audience, Role, StaffRole } from "@/lib/types";

export const SESSION_COOKIE = "cstg_session";

/**
 * Mirrors the JWT claims in docs/AUTHORIZATION.md §1.
 *
 * NOTE: the spec writes `principal_type` as lowercase `"customer" | "user"`, but
 * the API emits the `ActorType` enum (`CUSTOMER` | `USER`). We follow the actual
 * contract via the generated type so this cannot drift silently; the spec
 * discrepancy is tracked separately.
 */
export interface Session {
  token: string;
  role: Role;
  principalType: ActorType;
  /** The principal's own id — lets the UI tell "mine" from "someone else's". */
  principalId: string;
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const role = store.get(`${SESSION_COOKIE}_role`)?.value as Role | undefined;
  const principalType = store.get(`${SESSION_COOKIE}_type`)?.value as ActorType | undefined;
  const principalId = store.get(`${SESSION_COOKIE}_id`)?.value;

  if (!token || !role || !principalType || !principalId) return null;
  return { token, role, principalType, principalId };
}

export async function setSession(session: Session): Promise<void> {
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";
  const base = { httpOnly: true, sameSite: "lax", secure, path: "/" } as const;

  store.set(SESSION_COOKIE, session.token, base);
  // Role and principal type are duplicated into sibling cookies purely so the
  // server can pick a shell without decoding the JWT. They are UX hints only —
  // the backend re-derives both from the token on every request.
  store.set(`${SESSION_COOKIE}_role`, session.role, base);
  store.set(`${SESSION_COOKIE}_type`, session.principalType, base);
  store.set(`${SESSION_COOKIE}_id`, session.principalId, base);
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  for (const name of [
    SESSION_COOKIE,
    `${SESSION_COOKIE}_role`,
    `${SESSION_COOKIE}_type`,
    `${SESSION_COOKIE}_id`,
  ]) {
    store.delete(name);
  }
}

/** Which vocabulary this principal reads (docs/UIUX_FRONTEND.md §4). */
export function audienceFor(session: Session): Audience {
  return session.principalType === "CUSTOMER" ? "customer" : "staff";
}

export function isStaff(session: Session): session is Session & { role: StaffRole } {
  return session.principalType === "USER";
}
