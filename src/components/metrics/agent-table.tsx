/**
 * Per-agent metrics (spec09 frontend §4).
 *
 * A Server Component: it receives already-fetched rows and renders them. The
 * sort is a URL parameter handled by the page, so this stays free of client
 * state — and a sorted view stays shareable.
 *
 * **This is a performance view of named people.** Two things follow from that
 * and are not negotiable here: the attribution caveat is on the screen, and
 * every colour band carries its number.
 */

import { Table, TableBody, TableHead, Td, Tr } from "@/components/ui/table";
import type { AgentMetrics } from "@/lib/types";

export type AgentSortKey =
  | "name"
  | "open"
  | "in_progress"
  | "pending"
  | "resolved"
  | "sla"
  | "working"
  | "load";

/**
 * SLA met rate to a signalling colour.
 *
 * These tokens are status-only, and an SLA met rate *is* SLA status — the same
 * justification the breach donut uses. The number is always rendered beside
 * the colour, so colour is never the sole signal.
 */
function slaTone(rate: number): { className: string; label: string } {
  if (rate >= 0.95) return { className: "text-on-track", label: "on track" };
  if (rate >= 0.85) return { className: "text-at-risk", label: "at risk" };
  return { className: "text-overdue", label: "below target" };
}

function percent(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

function duration(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function AgentTable({
  items,
  attributionNote,
  sortHref,
  sort,
}: {
  items: AgentMetrics[];
  attributionNote: string;
  /** Builds the URL for a column header. Sorting stays in the URL. */
  sortHref: (key: AgentSortKey) => string;
  sort: AgentSortKey;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-border bg-surface px-4 py-6 text-sm text-text/60">
        No agents held tickets in this period.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Above the table, not in a tooltip and not in a doc. Shipping an
          approximation about named people without saying so is how a metric
          gets managed against and quietly becomes unfair. */}
      <p className="text-xs text-text/70">{attributionNote}</p>

      <Table caption="Per-agent workload and SLA performance for the selected period">
        <TableHead>
          <SortableTh label="Agent" columnKey="name" sort={sort} sortHref={sortHref} />
          <SortableTh label="Open" columnKey="open" sort={sort} sortHref={sortHref} />
          <SortableTh label="In progress" columnKey="in_progress" sort={sort} sortHref={sortHref} />
          <SortableTh
            label="Waiting on customer"
            columnKey="pending"
            sort={sort}
            sortHref={sortHref}
          />
          <SortableTh label="Resolved" columnKey="resolved" sort={sort} sortHref={sortHref} />
          <SortableTh label="SLA met" columnKey="sla" sort={sort} sortHref={sortHref} />
          <SortableTh label="Avg. working time" columnKey="working" sort={sort} sortHref={sortHref} />
          <SortableTh label="Load" columnKey="load" sort={sort} sortHref={sortHref} />
        </TableHead>
        <TableBody>
          {items.map((row) => {
            const tone = slaTone(row.sla_met_rate);
            return (
              <Tr key={row.agent.id}>
                <Td>
                  <span className="font-medium">{row.agent.name}</span>
                  {/* Included, and marked. Dropping them would make the period's
                      totals stop reconciling with Overview. */}
                  {!row.agent.is_active && (
                    <span className="ml-2 rounded-sm bg-canvas px-1.5 py-0.5 text-xs text-text/60">
                      Inactive
                    </span>
                  )}
                </Td>
                <Td className="tabular-nums">{row.open_tickets}</Td>
                <Td className="tabular-nums">{row.in_progress}</Td>
                <Td className="tabular-nums">{row.pending_customer}</Td>
                <Td className="tabular-nums">{row.resolved_in_period}</Td>
                <Td className="tabular-nums">
                  {row.resolved_in_period === 0 ? (
                    // No denominator, so no rate. A 0% here would read as a
                    // failure rather than an absence of data.
                    <span className="text-text/50">—</span>
                  ) : (
                    <span className={tone.className}>
                      {percent(row.sla_met_rate)}
                      <span className="sr-only"> — {tone.label}</span>
                    </span>
                  )}
                </Td>
                <Td className="tabular-nums">{duration(row.avg_working_seconds)}</Td>
                <Td className="tabular-nums">
                  {row.current_load_pct === null || row.current_load_pct === undefined ? (
                    // No ceiling set, so load is unknown — not zero.
                    <span className="text-text/50" title="No capacity limit set">
                      No limit
                    </span>
                  ) : (
                    <span className={row.current_load_pct >= 1 ? "text-overdue" : undefined}>
                      {percent(row.current_load_pct)}
                    </span>
                  )}
                </Td>
              </Tr>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SortableTh({
  label,
  columnKey,
  sort,
  sortHref,
}: {
  label: string;
  columnKey: AgentSortKey;
  sort: AgentSortKey;
  sortHref: (key: AgentSortKey) => string;
}) {
  const active = sort === columnKey;
  return (
    // `aria-sort` belongs on the header cell, not on the link inside it — the
    // link's implicit role does not support it, and a screen reader would drop
    // the sort state entirely.
    <th
      scope="col"
      aria-sort={active ? "descending" : "none"}
      className="px-4 py-[7px] text-[13px] font-medium"
    >
      <a
        href={sortHref(columnKey)}
        className="inline-flex items-center gap-1 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {label}
        {active && <span aria-hidden>↓</span>}
      </a>
    </th>
  );
}

/** Sort comparator, kept beside the keys it sorts by. */
export function sortAgents(items: AgentMetrics[], key: AgentSortKey): AgentMetrics[] {
  const value = (row: AgentMetrics): number | string => {
    switch (key) {
      case "name":
        return row.agent.name.toLowerCase();
      case "open":
        return row.open_tickets;
      case "in_progress":
        return row.in_progress;
      case "pending":
        return row.pending_customer;
      case "resolved":
        return row.resolved_in_period;
      case "sla":
        return row.sla_met_rate;
      case "working":
        return row.avg_working_seconds;
      case "load":
        // An agent with no ceiling sorts last rather than as 0%, which would
        // put the busiest uncapped agent at the bottom of a "least loaded" sort.
        return row.current_load_pct ?? -1;
    }
  };

  return [...items].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    if (typeof left === "string" && typeof right === "string") return left.localeCompare(right);
    return Number(right) - Number(left);
  });
}
