/**
 * CSV export passthrough (spec09 frontend §5).
 *
 * A plain `<a href>` to the backend cannot carry the bearer token — it lives in
 * an httpOnly cookie — so the link points here and the token is attached
 * server-side. The same shape as the attachment download route.
 *
 * The body is **streamed**, never buffered: an export at the row cap is tens of
 * megabytes, and holding it in the Node process would defeat the point of the
 * backend streaming it in the first place.
 */

import { API_BASE_URL } from "@/lib/api/client";
import { getSession } from "@/lib/auth/session";

/**
 * Only the filters `GET /tickets` accepts are forwarded.
 *
 * An allowlist rather than a passthrough: unknown parameters are dropped here
 * instead of reaching the backend, so a stray `tab=` or `preset=` from the
 * dashboard URL cannot turn into a 400 the user has no way to interpret.
 */
const FORWARDED = [
  "q",
  "status",
  "priority",
  "category",
  "breached",
  "assigned",
  "escalated",
  "tier",
  "assignee_id",
  "customer_id",
  "created_after",
  "created_before",
] as const;

export async function GET(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return new Response("Your session has expired.", { status: 401 });
  }

  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of FORWARDED) {
    const value = incoming.get(key);
    if (value !== null && value !== "") query.set(key, value);
  }

  const upstream = await fetch(
    `${API_BASE_URL}/api/v1/metrics/export/tickets.csv?${query}`,
    { headers: { Authorization: `Bearer ${session.token}` }, cache: "no-store" },
  );

  if (!upstream.ok) {
    // The row cap earns its own copy: it names the actual limit and the action
    // that fixes it. "Request failed" would leave the user with no next step.
    if (upstream.status === 422) {
      return new Response(
        "That's more than 50,000 tickets. Narrow the date range and try again.",
        { status: 422 },
      );
    }
    const message =
      upstream.status === 403
        ? "You don't have access to exports."
        : "Something went wrong on our end.";
    return new Response(message, { status: upstream.status });
  }

  const headers = new Headers();
  for (const header of ["content-type", "content-disposition"]) {
    const value = upstream.headers.get(header);
    if (value) headers.set(header, value);
  }
  if (!headers.has("content-disposition")) {
    headers.set("Content-Disposition", 'attachment; filename="tickets.csv"');
  }

  return new Response(upstream.body, { status: 200, headers });
}
