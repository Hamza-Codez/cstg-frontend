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
import { FilterBar } from "@/components/tickets/filters";
import { QueueView } from "@/components/tickets/queue-view";
import { SavedViews } from "@/components/tickets/saved-views";
import { listSavedViews } from "@/lib/api/saved-views";
import { getSession } from "@/lib/auth/session";
import { parseFilters, type TicketFilterValues } from "@/lib/filters";
import { loadQueue } from "@/lib/staff-queue";

export async function FilteredQueue({
  title,
  empty,
  searchParams,
  baseFilters = {},
}: {
  title: string;
  empty: string;
  searchParams: Record<string, string | string[] | undefined>;
  baseFilters?: TicketFilterValues;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const urlFilters = parseFilters(searchParams);
  const { tickets, error } = await loadQueue({ ...urlFilters, ...baseFilters });

  // Saved views are a staff convenience; a failure to load them must not take
  // the list down with it.
  const saved = await listSavedViews(session.token);
  const views = saved.ok ? saved.data.items : [];

  return (
    <div className="flex flex-col gap-4">
      <SavedViews views={views} role={session.role} onDelete={deleteSavedViewAction} />
      <FilterBar role={session.role} resultCount={tickets.length} />
      <QueueView title={title} tickets={tickets} empty={empty} error={error} />
    </div>
  );
}
