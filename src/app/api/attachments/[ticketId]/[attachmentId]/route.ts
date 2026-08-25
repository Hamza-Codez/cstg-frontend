/**
 * Attachment download (P14.8, spec03 §5).
 *
 * A plain `<a href>` to the backend cannot carry the bearer token — it lives in
 * an httpOnly cookie. So the link points here, and the token is attached
 * server-side.
 *
 * One handler serves both audiences rather than the portal/staff pair spec03 §5
 * sketched: authorization is entirely the backend's (INV-12), so two identical
 * handlers would differ only in their path.
 *
 * The response is **streamed**, never buffered — the same reason as upload.
 */

import { API_BASE_URL } from "@/lib/api/client";
import { getSession } from "@/lib/auth/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string; attachmentId: string }> },
): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return new Response("Your session has expired.", { status: 401 });
  }

  const { ticketId, attachmentId } = await params;

  const upstream = await fetch(
    `${API_BASE_URL}/api/v1/tickets/${ticketId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${session.token}` }, cache: "no-store" },
  );

  if (!upstream.ok) {
    // Same copy for absent and hidden (docs/UIUX_FRONTEND.md §8) — the UI must
    // not reveal that a file exists but belongs to someone else.
    const message =
      upstream.status === 404 ? "This file couldn't be found." : "Something went wrong on our end.";
    return new Response(message, { status: upstream.status });
  }

  const headers = new Headers();
  for (const header of ["content-type", "content-length", "content-disposition"]) {
    const value = upstream.headers.get(header);
    if (value) headers.set(header, value);
  }
  // Belt and braces: the backend already sets a non-inline disposition, and the
  // declared content type is not verified against the bytes (spec03 §6), so
  // nothing here may render in this origin.
  if (!headers.has("content-disposition")) {
    headers.set("Content-Disposition", "attachment");
  }

  return new Response(upstream.body, { status: 200, headers });
}
