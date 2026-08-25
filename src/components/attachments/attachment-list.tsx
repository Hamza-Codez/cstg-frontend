/**
 * Attachment list (spec03 §5). Server Component — it only renders data.
 *
 * Downloads point at a Route Handler on this origin, which attaches the bearer
 * token server-side (spec00 §4). A plain link to the backend could not carry it.
 */

import { Download, Paperclip } from "lucide-react";

import { downloadUrl } from "@/lib/api/attachments";
import { formatBytes } from "@/lib/format";
import type { AttachmentResponse } from "@/lib/types";

export function AttachmentList({
  ticketId,
  attachments,
}: {
  ticketId: string;
  attachments: AttachmentResponse[];
}) {
  if (attachments.length === 0) {
    return <p className="text-sm text-text/60">No files attached.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {attachments.map((attachment) => (
        <li key={attachment.id}>
          <a
            href={downloadUrl(ticketId, attachment.id)}
            className="flex cursor-pointer items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 text-sm hover:border-structure"
          >
            <Paperclip aria-hidden strokeWidth={1.5} className="size-4 shrink-0 text-structure" />
            <span className="min-w-0 flex-1 truncate text-text">{attachment.filename}</span>
            <span className="shrink-0 text-xs text-text/60">{formatBytes(attachment.size)}</span>
            <Download aria-hidden strokeWidth={1.5} className="size-4 shrink-0 text-structure" />
          </a>
        </li>
      ))}
    </ul>
  );
}
