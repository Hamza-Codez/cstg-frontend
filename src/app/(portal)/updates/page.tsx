/**
 * Customer-facing updates (P21).
 *
 * `/updates`, not `/notifications`: route groups do not affect the URL, so a
 * `notifications/page.tsx` in both `(portal)` and `(staff)` would be two pages
 * resolving to one path — which Next refuses. Splitting the path is also the
 * better answer, because the customer vocabulary calls this "Updates" anyway.
 */

import { NotificationsPage } from "@/components/notifications/notifications-page";

export const metadata = { title: "Updates · Support Engine" };

export default async function PortalUpdates({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <NotificationsPage audience="customer" searchParams={await searchParams} />;
}
