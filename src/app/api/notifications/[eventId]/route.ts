/**
 * Dismiss one notification (P21).
 *
 * A mutation, so it carries the same-origin guard: Next validates Origin for
 * Server Actions but NOT for Route Handlers, which would otherwise leave this
 * CSRF-reachable (spec00 §5).
 *
 * The backend answers 404 for an event the caller may not see, identical to one
 * that does not exist — that is deliberate, and this handler passes the status
 * through unchanged rather than trying to be more helpful about which it was.
 */

import { API_BASE_URL } from "@/lib/api/client";
import { getSession } from "@/lib/auth/session";
import { sameOriginViolation } from "@/lib/http/origin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
): Promise<Response> {
  const violation = sameOriginViolation(request);
  if (violation) return violation;

  const session = await getSession();
  if (!session) {
    return Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }

  const { eventId } = await params;

  const upstream = await fetch(
    `${API_BASE_URL}/api/v1/notifications/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.token}` },
      cache: "no-store",
    },
  );

  // 204 carries no body, and returning `upstream.body` for it makes fetch
  // reject with "Response constructor: Invalid response status code".
  if (upstream.status === 204) {
    return new Response(null, { status: 204 });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
