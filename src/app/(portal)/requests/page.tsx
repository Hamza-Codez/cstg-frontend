import { Plus, Ticket } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SlaCountdown } from "@/components/sla/sla-countdown";
import { StatusBadge } from "@/components/tickets/status-badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listTickets } from "@/lib/api/tickets";
import { getSession } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/labels";

export const metadata = { title: "My requests · Support Engine" };

export default async function RequestsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const result = await listTickets(session.token, { limit: 50 });
  if (!result.ok) {
    if (result.error.code === "UNAUTHENTICATED") redirect("/sign-out");
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-overdue">Something went wrong on our end. Try again.</p>
        </CardBody>
      </Card>
    );
  }

  const tickets = result.data.items;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-medium">My requests</h1>
        <Link
          href="/requests/new"
          className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-accent px-4 py-2 text-[15px] font-medium text-on-accent transition-colors duration-fast hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Plus aria-hidden className="size-4" strokeWidth={1.5} />
          {ACTIONS.newRequest}
        </Link>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={Ticket}
              message="No requests yet. Start one and we'll pick it up."
              action={
                <Link
                  href="/requests/new"
                  className="cursor-pointer rounded-md bg-accent px-4 py-2 text-[15px] font-medium text-on-accent hover:bg-accent-hover"
                >
                  {ACTIONS.newRequest}
                </Link>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {tickets.map((ticket) => {
            const settled = ticket.status === "RESOLVED" || ticket.status === "CLOSED";
            return (
              <li key={ticket.id}>
                <Link href={`/requests/${ticket.id}`} className="group block cursor-pointer">
                  <Card className="transition-colors duration-fast hover:border-structure">
                    <CardHeader>
                      <CardTitle>{ticket.subject}</CardTitle>
                    </CardHeader>
                    <CardBody className="flex flex-wrap items-center justify-between gap-3">
                      <StatusBadge
                        status={ticket.status}
                        audience="customer"
                        breached={ticket.sla_breached_at !== null && !settled}
                      />
                      <SlaCountdown
                        deadline={ticket.deadline}
                        createdAt={ticket.created_at}
                        audience="customer"
                        settled={settled}
                      />
                      <div className="ml-auto flex items-center text-[15px] font-medium text-accent group-hover:underline">
                        View Request &rarr;
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
