/**
 * Mark read (P19.7).
 *
 * A mutation, so it carries the same-origin guard: Next validates Origin for
 * Server Actions but NOT for Route Handlers, which would otherwise leave this
 * CSRF-reachable (spec00 §5).
 */

import { API_BASE_URL } from "@/lib/api/client";
import { getSession } from "@/lib/auth/session";
import { sameOriginViolation } from "@/lib/http/origin";

export async function POST(request: Request): Promise<Response> {
  const violation = sameOriginViolation(request);
  if (violation) return violation;

  const session = await getSession();
  if (!session) {
    return Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }

  const upstream = await fetch(`${API_BASE_URL}/api/v1/notifications/read`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
