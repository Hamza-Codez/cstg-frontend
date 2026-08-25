/**
 * Staff notifications (P21).
 *
 * Same body as the portal route at `/updates`; the two differ only in their
 * shell and their vocabulary. Two paths rather than one because route groups do
 * not affect the URL, so a `notifications/page.tsx` in both `(portal)` and
 * `(staff)` would be two pages resolving to the same route.
 */

import { NotificationsPage } from "@/components/notifications/notifications-page";

export const metadata = { title: "Notifications · Support Engine" };

export default async function StaffNotifications({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <NotificationsPage audience="staff" searchParams={await searchParams} />;
}
