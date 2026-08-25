import { MessageSquare, StickyNote } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AttachmentList } from "@/components/attachments/attachment-list";
import { AttachmentUpload } from "@/components/attachments/attachment-upload";
import { CommentComposer } from "@/components/comments/comment-composer";
import { Timeline } from "@/components/comments/timeline";
import { AssignDialog } from "@/components/forms/assign-dialog";
import { SlaCountdown } from "@/components/sla/sla-countdown";
import { ActionPanel } from "@/components/tickets/action-panel";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { StatusBadge } from "@/components/tickets/status-badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { listAttachments } from "@/lib/api/attachments";
import { getTicket, listActiveAgents, listComments } from "@/lib/api/tickets";
import { getSession } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/format";
import { categoryLabel, commentTypeLabel, priorityLabel, term } from "@/lib/labels";

/** "2 hours" / "30 minutes" — the window a ticket was actually given. */
function slaWindowLabel(seconds: number): string {
  if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  const hours = seconds / 3600;
  const rounded = Number.isInteger(hours) ? hours : Number(hours.toFixed(2));
  return `${rounded} hour${rounded === 1 ? "" : "s"}`;
}

export const metadata = { title: "Ticket · Support Engine" };

export default async function StaffTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/sign-in");

  // Fired together, not in sequence. Each is independent, and the API decides
  // visibility on every one of them — so a request the caller may not see returns
  // its own 404 rather than leaking through this parallelism.
  const canAssign = session.role === "DISPATCHER" || session.role === "ADMIN";
  const [result, comments, agentsResult, attachments] = await Promise.all([
    getTicket(session.token, id),
    listComments(session.token, id),
    canAssign ? listActiveAgents(session.token) : Promise.resolve(null),
    listAttachments(session.token, id),
  ]);
  if (!result.ok) {
    if (result.error.code === "UNAUTHENTICATED") redirect("/sign-out");
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

  const notes = comments.ok ? comments.data.items : [];
  // Agents are not offered the staff directory (they cannot reassign), so the
  // request is skipped rather than 403'd.
  const agents = agentsResult?.ok ? agentsResult.data.items : [];

  return (
    <div className="flex flex-col gap-4">
      <Link href="/queue" className="cursor-pointer text-sm text-structure hover:underline">
        ← Back to queue
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{ticket.subject}</CardTitle>
          <SlaCountdown
            dueAt={ticket.sla_due_at}
                        status={ticket.status}
            createdAt={ticket.created_at}
            audience="staff"
            settled={settled}
          />
        </CardHeader>
        <CardBody className="flex flex-wrap items-center gap-3">
          <StatusBadge
            status={ticket.status}
            audience="staff"
            breached={ticket.sla_breached_at !== null && !settled}
          />
          <PriorityBadge priority={ticket.priority} />
          {ticket.escalation_level > 0 && (
            <span className="text-xs text-at-risk">Escalated</span>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-4 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Request</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="whitespace-pre-wrap text-sm text-text">{ticket.body}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              {notes.length === 0 ? (
                <p className="text-sm text-text/60">Nothing has been sent yet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {notes.map((note) => {
                    const isInternal = note.type === "INTERNAL_NOTE";
                    return (
                      <li
                        key={note.id}
                        className={
                          isInternal
                            ? "border-l-4 border-l-at-risk bg-canvas px-3 py-2"
                            : "border-l-4 border-l-border px-3 py-2"
                        }
                      >
                        <div className="flex items-center justify-between text-xs text-text/60">
                          <span className="flex items-center gap-2">
                            {isInternal ? (
                              <StickyNote aria-hidden className="size-3.5" strokeWidth={1.5} />
                            ) : (
                              <MessageSquare aria-hidden className="size-3.5" strokeWidth={1.5} />
                            )}
                            {note.author.name}
                            {note.author.type === "CUSTOMER" && " (Customer)"}
                          </span>
                          <span>
                            {commentTypeLabel(note.type)} · {formatDateTime(note.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-text">{note.body}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
              {!settled && <CommentComposer ticketId={ticket.id} audience="staff" />}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              <AttachmentList
                ticketId={ticket.id}
                attachments={attachments.ok ? attachments.data.items : []}
              />
              {ticket.status !== "CLOSED" && <AttachmentUpload ticketId={ticket.id} />}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{term("activity", "staff")}</CardTitle>
            </CardHeader>
            <CardBody>
              <Timeline events={ticket.timeline ?? []} audience="staff" />
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              <ActionPanel
                ticketId={ticket.id}
                status={ticket.status}
                role={session.role}
                hasAssignee={ticket.assignee != null}
                isAssignedToMe={ticket.assignee?.id === session.principalId}
              />
              {canAssign && !settled && (
                <AssignDialog
                  ticketId={ticket.id}
                  agents={agents}
                  currentAssigneeId={ticket.assignee?.id ?? null}
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Properties</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="flex flex-col gap-2 text-xs">
                <Row label={term("assignee", "staff")} value={ticket.assignee?.name ?? "Unassigned"} />
                <Row label="Category" value={categoryLabel(ticket.category)} />
                <Row label="Created" value={formatDateTime(ticket.created_at)} />
                <Row
                  label={term("deadline", "staff")}
                  value={formatDateTime(ticket.sla_due_at)}
                />
                {/* Provenance. Without it a ticket created under an old policy
                    looks like a bug against the current configuration
                    (spec06 frontend §5). Staff only — a policy version is a
                    sharper-edged version of the priority customers never see. */}
                {ticket.sla_policy_seconds !== null &&
                  ticket.sla_policy_seconds !== undefined && (
                    <Row
                      label="Target"
                      value={`${slaWindowLabel(ticket.sla_policy_seconds)} · ${priorityLabel(
                        ticket.priority,
                      )}${
                        ticket.sla_policy_activated_at
                          ? ` · policy of ${formatDate(ticket.sla_policy_activated_at)}`
                          : ""
                      }`}
                    />
                  )}
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text/60">{label}</dt>
      <dd className="text-right text-text">{value}</dd>
    </div>
  );
}
