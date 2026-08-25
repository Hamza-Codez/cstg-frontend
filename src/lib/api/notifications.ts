/** Notifications (docs/API.md §14, extended at P21). */

import { apiFetch, type ApiResult } from "./client";
import type { NotificationPage } from "@/lib/types";

/**
 * Recent notifications, **read and unread**, newest first.
 *
 * Used by the notifications page, which is a Server Component and so fetches
 * with the session token directly rather than through the `/api/notifications`
 * proxy the bell polls. The proxy exists because a Server Component cannot
 * re-run on a timer; a page render has no such problem.
 */
export function listNotifications(
  token: string,
  params: { limit?: number; cursor?: string } = {},
): Promise<ApiResult<NotificationPage>> {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  // Only when present: an empty `cursor=` would reach the backend as a
  // malformed cursor and come back 400.
  if (params.cursor) query.set("cursor", params.cursor);

  const suffix = query.size > 0 ? `?${query}` : "";
  return apiFetch<NotificationPage>(`/api/v1/notifications${suffix}`, { token });
}
