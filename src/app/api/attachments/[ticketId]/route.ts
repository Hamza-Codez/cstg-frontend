/**
 * Attachment upload (P14.6, spec00 §4).
 *
 * The browser cannot POST to the backend directly: the JWT lives in an httpOnly
 * cookie only server code can read, and the backend has no CORS middleware. So
 * the upload terminates here and is forwarded with the Bearer header attached
 * server-side.
 *
 * The body is **streamed** through — a 10 MB upload must not be buffered into
 * this process, which also serves every other request.
 */

import { API_BASE_URL } from "@/lib/api/client";
import { getSession } from "@/lib/auth/session";
import { sameOriginViolation } from "@/lib/http/origin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
): Promise<Response> {
  const violation = sameOriginViolation(request);
  if (violation) return violation;

  const session = await getSession();
  // 401 rather than a redirect: this is fetched by script, not navigated to,
  // and a redirect would arrive at the XHR as an opaque success.
  if (!session) {
    return Response.json(
      { error: { code: "UNAUTHENTICATED", message: "Your session has expired.", details: {} } },
      { status: 401 },
    );
  }

  const { ticketId } = await params;

  const upstream = await fetch(`${API_BASE_URL}/api/v1/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
      // Content-Type is copied verbatim so the multipart boundary survives.
      // Setting it by hand is the classic failure here.
      "Content-Type": request.headers.get("content-type") ?? "",
    },
    body: request.body,
    // Required by undici whenever a stream is used as a body.
    duplex: "half",
    cache: "no-store",
  } as RequestInit & { duplex: "half" });

  // The backend's error envelope is passed through unchanged, so the client
  // parses it exactly as it parses every other failure.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
