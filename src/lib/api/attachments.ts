/** Typed attachment calls (docs/API.md §8). */

import { apiFetch, type ApiResult } from "./client";
import type { AttachmentResponse } from "@/lib/types";

/** Server-side only — takes the bearer token from the session. */
export function listAttachments(
  token: string,
  ticketId: string,
): Promise<ApiResult<{ items: AttachmentResponse[] }>> {
  return apiFetch<{ items: AttachmentResponse[] }>(
    `/api/v1/tickets/${ticketId}/attachments`,
    { token },
  );
}

/**
 * Where the browser sends an upload — a Next Route Handler on this origin, not
 * the backend (spec00 §4 D2). The browser holds no token, and the backend has
 * no CORS, so a direct call would fail twice over.
 */
export function uploadUrl(ticketId: string): string {
  return `/api/attachments/${ticketId}`;
}

/** Where the browser downloads from. Same reasoning as `uploadUrl`. */
export function downloadUrl(ticketId: string, attachmentId: string): string {
  return `/api/attachments/${ticketId}/${attachmentId}`;
}
