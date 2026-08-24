import { redirect } from "next/navigation";

import { clearSession } from "@/lib/auth/session";

/**
 * Sign out — clears the session cookies and returns to sign-in.
 *
 * POST is the user-initiated path (the top bar submits a form).
 *
 * GET also exists because pages that discover an expired token must clear the
 * stale cookie, and a Server Component cannot write cookies during render — only
 * a route handler or action can. Without it those pages would redirect to
 * /sign-in, still hold a cookie, and be bounced straight back: a loop.
 *
 * The GET path is guarded by Fetch Metadata so it cannot be fired as a
 * cross-site side effect. A real navigation carries `Sec-Fetch-Mode: navigate`;
 * an <img src="/sign-out">, a script fetch, or a prefetch does not, and is
 * refused. Browsers that send no Sec-Fetch-* headers at all fall through to the
 * permissive branch, which is the same exposure as before this guard existed.
 */
async function signOut(): Promise<never> {
  await clearSession();
  redirect("/sign-in");
}

export async function POST(): Promise<never> {
  return signOut();
}

export async function GET(request: Request): Promise<Response | never> {
  const mode = request.headers.get("sec-fetch-mode");
  const dest = request.headers.get("sec-fetch-dest");

  if (mode !== null && (mode !== "navigate" || dest === "image")) {
    return new Response("Sign out requires a navigation or a POST.", { status: 405 });
  }
  return signOut();
}
