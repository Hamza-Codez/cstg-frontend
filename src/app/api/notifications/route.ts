/**
 * Notification list (P19.7, spec08 frontend §3).
 *
 * Polling cannot be server-rendered: a Server Component does not re-run on a
 * timer. So the hook calls THIS handler on the same origin — the browser sends
 * the httpOnly cookie automatically, and the bearer token is attached here,
 * server-side. Calling the backend directly would need the token in JavaScript
 * and undo the whole reason session.ts is `server-only`.
 */

import { API_BASE_URL } from "@/lib/api/client";
import { getSession } from "@/lib/auth/session";

export async function GET(request: Request): Promise<Response> {
  const session = await getSession();
  // 401, not a redirect: this is fetched by script, and a redirect would reach
  // the caller as an opaque success.
  if (!session) {
    return Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }

  const limit = new URL(request.url).searchParams.get("limit") ?? "20";
  const upstream = await fetch(`${API_BASE_URL}/api/v1/notifications?limit=${limit}`, {
    headers: { Authorization: `Bearer ${session.token}` },
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
