/**
 * Browser-side upload mechanics, shared by the detail-page uploader and the
 * new-request form (spec03 §3–4).
 *
 * XMLHttpRequest, not fetch: fetch cannot report upload progress, and a 10 MB
 * upload on a phone with no feedback reads as a frozen page. This is the only
 * place in the app that does not use fetch.
 *
 * The target is always a Next Route Handler on this origin (spec00 §4 D2) — the
 * browser holds no bearer token, and the backend has no CORS.
 */

import { uploadUrl } from "@/lib/api/attachments";
import { formatBytes } from "@/lib/format";

/** Mirrors the backend for fast feedback; the server remains authoritative. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/json",
];

/**
 * Client-side rejection reason, or null if the file looks acceptable.
 *
 * States the actual limit and the actual file, never a bare refusal — a user
 * told only "invalid file" has to guess which rule they broke.
 */
export function preflight(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Files must be ${formatBytes(MAX_UPLOAD_BYTES)} or smaller. ${file.name} is ${formatBytes(file.size)}.`;
  }
  // An empty `type` means the browser could not tell; let the backend decide
  // rather than blocking a legitimate file on a missing hint.
  if (file.type && !ALLOWED_CONTENT_TYPES.includes(file.type)) {
    return "That file type isn't supported.";
  }
  return null;
}

export function putFile(
  ticketId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl(ticketId));
    // Content-Type is deliberately unset: only the browser knows the multipart
    // boundary. Setting it by hand is the classic failure here.

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = "Something went wrong on our end. Try again.";
      try {
        message = JSON.parse(xhr.responseText)?.error?.message ?? message;
      } catch {
        // A non-JSON body (proxy error, crash) still has to become a readable
        // failure — the same posture as lib/api/client.ts.
      }
      reject(new Error(message));
    });

    xhr.addEventListener("error", () => reject(new Error("Could not reach the server.")));
    xhr.send(body);
  });
}
