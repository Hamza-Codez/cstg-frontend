/**
 * The badge count (P19.7).
 *
 * Separate from the list handler so the frequent poll stays cheap — the UI must
 * not fetch the list just to derive a number.
 */

import { API_BASE_URL } from "@/lib/api/client";
import { getSession } from "@/lib/auth/session";

export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }

  const upstream = await fetch(`${API_BASE_URL}/api/v1/notifications/count`, {
    headers: { Authorization: `Bearer ${session.token}` },
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
