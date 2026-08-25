import "server-only";

/**
 * The notifications page, written once for both audiences (P21).
 *
 * The two route groups need their own `page.tsx` because the shells differ —
 * `(portal)` for customers, `(staff)` for everyone else — but the body is the
 * same list, so it lives here rather than being copied twice and drifting.
 *
 * Server Component: it reads the cursor from the URL and fetches with the
 * session token, then hands plain data to the client shell. The client never
 * fetches this list, so the token never leaves the server.
 */

import { redirect } from "next/navigation";

import { NotificationFeed } from "@/components/notifications/notification-feed";
import { Card, CardBody } from "@/components/ui/card";
import { listNotifications } from "@/lib/api/notifications";
import { getSession } from "@/lib/auth/session";
import { notificationsPath } from "@/lib/labels";
import type { Audience } from "@/lib/types";

/** One screenful. The bell shows seven; this is the archive. */
const PAGE_SIZE = 30;

export async function NotificationsPage({
  audience,
  searchParams,
}: {
  audience: Audience;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const raw = searchParams.cursor;
  const cursor = Array.isArray(raw) ? raw[0] : raw;

  const result = await listNotifications(session.token, { limit: PAGE_SIZE, cursor });

  if (!result.ok) {
    if (result.error.code === "UNAUTHENTICATED") redirect("/sign-out");
    // A stale or hand-edited cursor is a 400. Sending the reader back to the
    // first page is the useful answer; an error card would strand them on a
    // URL they cannot fix.
    if (result.error.code === "VALIDATION_ERROR" && cursor) redirect(notificationsPath(audience));
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-overdue">Something went wrong on our end. Try again.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <NotificationFeed
      audience={audience}
      initialItems={result.data.items}
      nextCursor={result.data.next_cursor ?? null}
    />
  );
}
