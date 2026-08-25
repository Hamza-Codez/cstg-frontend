import "server-only";

/**
 * A staff list with its filter bar and saved views (spec04 frontend §3).
 *
 * Server Component: it reads the URL, fetches with the session token, and hands
 * plain data to the small client shells. The client never fetches, so the token
 * never leaves the server.
 *
 * `baseFilters` are the ones a page owns and the user cannot remove — the
 * Unassigned queue is *defined* by `assigned=false`. They are applied after the
 * URL filters so a hand-edited query cannot turn one queue into another.
 */

import { redirect } from "next/navigation";

import { deleteSavedViewAction } from "@/app/actions/saved-views";
import { ExportButton } from "@/components/metrics/export-button";
import { FilterBar } from "@/components/tickets/filters";
import { QueueView } from "@/components/tickets/queue-view";
import { SavedViews } from "@/components/tickets/saved-views";
import { listSavedViews } from "@/lib/api/saved-views";
import { listActiveAgents } from "@/lib/api/tickets";
import { getSession } from "@/lib/auth/session";
import { parseFilters, type TicketFilterValues } from "@/lib/filters";
import { loadQueue } from "@/lib/staff-queue";
import type { UserSummary } from "@/lib/types";

export async function FilteredQueue({
  title,
  empty,
  searchParams,
  baseFilters = {},
  selectable = false,
}: {
  title: string;
  empty: string;
  searchParams: Record<string, string | string[] | undefined>;
  baseFilters?: TicketFilterValues;
  selectable?: boolean;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  // Every queue built on this is a staff surface, and `QueueView` types its
  // role as `StaffRole` for that reason. Narrowing here rather than casting:
  // the route-group layouts already redirect a customer away, so this only
  // fires if one is ever reachable — in which case sending them to their own
  // requests is the right answer, not rendering a staff table at them.
  if (session.role === "CUSTOMER") redirect("/requests");
  const staffRole = session.role;

  const urlFilters = parseFilters(searchParams);
  const { tickets, error } = await loadQueue({ ...urlFilters, ...baseFilters });

  // Saved views are a staff convenience; a failure to load them must not take
  // the list down with it.
  const saved = await listSavedViews(session.token);
  const views = saved.ok ? saved.data.items : [];

  let agents: UserSummary[] = [];
  if (selectable && (session.role === "DISPATCHER" || session.role === "ADMIN")) {
    const agentsRes = await listActiveAgents(session.token);
    if (agentsRes.ok) {
      agents = agentsRes.data.items;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-medium">{title}</h1>
        {/* The export carries the URL's filters, so it always matches what is
            on screen — the backend accepts the same filter set for exactly
            that reason (spec09 §6). Admin-only, matching the endpoint: absent
            for other roles rather than present and 403ing. */}
        {session.role === "ADMIN" && <ExportButton />}
      </div>
      <FilterBar
        role={session.role}
        resultCount={tickets.length}
        savedViews={
          <SavedViews views={views} role={session.role} onDelete={deleteSavedViewAction} />
        }
      />
      <div className="flex flex-col gap-2">
        <QueueView
          title={title}
          tickets={tickets}
          empty={empty}
          error={error}
          role={staffRole}
          selectable={selectable}
          agents={agents}
        />
      </div>
    </div>
  );
}
