import { Plus, Search, Ticket } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SlaCountdown } from "@/components/sla/sla-countdown";
import { StatusBadge } from "@/components/tickets/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listTickets } from "@/lib/api/tickets";
import { parseFilters } from "@/lib/filters";
import { getSession } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/labels";

export const metadata = { title: "My requests · Support Engine" };

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  // Customers get search over their own requests. The backend scopes it to
  // them, so nothing here needs to say so (INV-9).
  const filters = parseFilters(await searchParams);
  const result = await listTickets(session.token, { limit: 50, ...filters });
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-medium">My requests</h1>
        <form action="/requests" method="get" role="search" className="order-last w-full sm:order-none sm:w-auto">
          <label htmlFor="requests-search" className="sr-only">
            Search your requests
          </label>
          <div className="flex items-center gap-2 rounded-sm border border-border bg-surface px-2 py-1.5">
            <Search aria-hidden strokeWidth={1.5} className="size-4 text-structure" />
            <input
              id="requests-search"
              type="search"
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Search your requests"
              className="w-full bg-transparent text-sm text-text placeholder:text-text/50 focus-visible:outline-none sm:w-52"
            />
          </div>
        </form>
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
              message={
                filters.q
                  ? `No requests match “${filters.q}”.`
                  : "No requests yet. Start one and we'll pick it up."
              }
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
                        dueAt={ticket.sla_due_at}
                        status={ticket.status}
                        createdAt={ticket.created_at}
                        audience="customer"
                        settled={settled}
                      />
                      <div className="ml-auto flex items-center">
                        <div className={buttonVariants({ variant: "secondary", className: "pointer-events-none" })}>
                          View Request
                        </div>
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
