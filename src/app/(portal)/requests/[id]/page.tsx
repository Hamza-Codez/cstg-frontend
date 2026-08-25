import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AttachmentList } from "@/components/attachments/attachment-list";
import { AttachmentUpload } from "@/components/attachments/attachment-upload";
import { CommentComposer } from "@/components/comments/comment-composer";
import { CustomerActions } from "@/components/tickets/customer-actions";
import { Timeline } from "@/components/comments/timeline";
import { SlaCountdown } from "@/components/sla/sla-countdown";
import { StatusBadge } from "@/components/tickets/status-badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { listAttachments } from "@/lib/api/attachments";
import { getTicket, listComments } from "@/lib/api/tickets";
import { getSession } from "@/lib/auth/session";
import { categoryLabel, term } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Request · Support Engine" };

export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attachmentsFailed?: string }>;
}) {
  const { id } = await params;
  // Set by the new-request flow when the ticket was created but a file was not
  // attached (spec03 §4). The ticket still exists — say so plainly and point at
  // the fix rather than failing the whole flow.
  const failedUploads = Number((await searchParams).attachmentsFailed ?? 0);
  const session = await getSession();
  if (!session) redirect("/sign-in");

  // Both requests go out together; the backend scopes each one independently.
  const [result, comments, attachments] = await Promise.all([
    getTicket(session.token, id),
    listComments(session.token, id),
    listAttachments(session.token, id),
  ]);
  if (!result.ok) {
    if (result.error.code === "UNAUTHENTICATED") redirect("/sign-out");
    // 404 and "hidden from you" share copy on purpose (§8) — the UI must not
    // reveal that a ticket exists but belongs to someone else.
    if (result.error.code === "NOT_FOUND" || result.error.code === "FORBIDDEN") notFound();
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-overdue">Something went wrong on our end. Try again.</p>
        </CardBody>
      </Card>
    );
  }

  const ticket = result.data;
  const settled = ticket.status === "RESOLVED" || ticket.status === "CLOSED";

  // Customers read only PUBLIC_REPLY; the backend enforces that (INV-9).
  const replies = comments.ok ? comments.data.items : [];

  return (
    <div className="flex flex-col gap-4">
      <Link href="/requests" className="cursor-pointer text-sm text-structure hover:underline">
        ← My requests
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{ticket.subject}</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusBadge
              status={ticket.status}
              audience="customer"
              breached={ticket.sla_breached_at !== null && !settled}
            />
            <SlaCountdown
              dueAt={ticket.sla_due_at}
                        status={ticket.status}
              createdAt={ticket.created_at}
              audience="customer"
              settled={settled}
            />
          </div>
          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
            <div>
              <dt className="text-text/60">About</dt>
              <dd className="text-text">{categoryLabel(ticket.category)}</dd>
            </div>
            <div>
              <dt className="text-text/60">Sent</dt>
              <dd className="text-text">{formatDateTime(ticket.created_at)}</dd>
            </div>
          </dl>
          <p className="whitespace-pre-wrap text-sm text-text">{ticket.body}</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          {replies.length === 0 ? (
            <p className="text-sm text-text/60">No replies yet. We&apos;ll be in touch here.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {replies.map((reply) => (
                <li key={reply.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs text-text/60">
                    <span className="flex items-center gap-2">
                      <MessageSquare aria-hidden className="size-3.5" strokeWidth={1.5} />
                      {reply.author.name}
                      {reply.author.type === "USER" && " (Support)"}
                    </span>
                    <span>{formatDateTime(reply.created_at)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-text">{reply.body}</p>
                </li>
              ))}
            </ul>
          )}
          <CustomerActions ticketId={ticket.id} status={ticket.status} />
          {ticket.status !== "CLOSED" && (
            <CommentComposer ticketId={ticket.id} audience="customer" />
          )}
        </CardBody>
      </Card>

      {failedUploads > 0 && (
        <p role="alert" className="rounded-sm border border-at-risk bg-surface px-3 py-2 text-sm text-text">
          Request sent. {failedUploads === 1 ? "1 file" : `${failedUploads} files`} couldn&apos;t be
          attached — you can add {failedUploads === 1 ? "it" : "them"} below.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Files</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <AttachmentList
            ticketId={ticket.id}
            attachments={attachments.ok ? attachments.data.items : []}
          />
          {/* Closed requests take nothing new, matching the reply composer. */}
          {ticket.status !== "CLOSED" && <AttachmentUpload ticketId={ticket.id} />}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{term("activity", "customer")}</CardTitle>
        </CardHeader>
        <CardBody>
          <Timeline events={ticket.timeline ?? []} audience="customer" />
        </CardBody>
      </Card>
    </div>
  );
}
