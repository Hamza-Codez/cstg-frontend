/**
 * Admin dashboard (spec09 frontend §4).
 *
 * Three tabs behind a URL-driven date range. Every tab is server-fetched with
 * the session token; the range and tab controls are thin client shells that
 * only rewrite the query string. **No client fetch path is introduced** — the
 * same posture as the queue filters in spec04.
 */

import { redirect } from "next/navigation";

import { AgentTable, type AgentSortKey, sortAgents } from "@/components/metrics/agent-table";
import { BreachDonut, PriorityChart, StatusChart, TrendChart } from "@/components/metrics/charts";
import { DateRange } from "@/components/metrics/date-range";
import { ExportButton } from "@/components/metrics/export-button";
import { NeedsAttention } from "@/components/metrics/needs-attention";
import { Stat } from "@/components/metrics/stat";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { getAgentMetrics, getMetrics, getTimeseries } from "@/lib/api/admin";
import { listTickets } from "@/lib/api/tickets";
import { getSession } from "@/lib/auth/session";
import { categoryLabel, priorityLabel, statusLabel, tierLabel } from "@/lib/labels";
import { CATEGORIES, PRIORITIES, TIERS } from "@/lib/filters";
import { SERIES, describeRange, rangeToParams, readRange } from "@/lib/metrics-range";
import type { GroupMetrics } from "@/lib/types";

export const metadata = { title: "Dashboard · Support Engine" };

// Reused from `lib/filters`, not re-listed: a new tier or category must
// appear on this dashboard without anyone remembering to add it here.

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "trends", label: "Trends" },
  { id: "agents", label: "Agents" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const SORT_KEYS: AgentSortKey[] = [
  "name",
  "open",
  "in_progress",
  "pending",
  "resolved",
  "sla",
  "working",
  "load",
];

function percent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function readableDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function groupTotal(row: GroupMetrics | undefined): number {
  if (!row) return 0;
  // `pending_customer` is included deliberately: after spec05 the four v1
  // statuses no longer sum to the total, and a breakdown that quietly drops a
  // status is one whose rows do not add up to its header.
  return row.open + row.in_progress + row.pending_customer + row.resolved + row.closed;
}

function ErrorCard({ code }: { code: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-overdue">
          {code === "FORBIDDEN"
            ? "You do not have access to this."
            : "Something went wrong on our end. Try again."}
        </p>
      </CardBody>
    </Card>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const params = await searchParams;
  const range = readRange(params);
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab: TabId = TABS.some((t) => t.id === requestedTab)
    ? (requestedTab as TabId)
    : "overview";

  const tabs = TABS.map((item) => ({
    ...item,
    href: `/dashboard?${rangeToParams({ ...range, tab: item.id })}`,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-medium">Dashboard</h1>
        {/* Admin-only, matching the endpoint: the button is absent for other
            roles rather than present and 403ing. */}
        {session.role === "ADMIN" && <ExportButton />}
      </div>

      <Tabs items={tabs} active={tab} label="Dashboard views" />
      <DateRange tab={tab} />

      {tab === "overview" && <OverviewTab token={session.token} />}
      {tab === "trends" && <TrendsTab token={session.token} params={params} />}
      {tab === "agents" && <AgentsTab token={session.token} params={params} />}
    </div>
  );
}

async function OverviewTab({ token }: { token: string }) {
  const [metricsResult, ticketsResult] = await Promise.all([
    getMetrics(token),
    listTickets(token, { status: "OPEN", limit: 5 }),
  ]);

  if (!metricsResult.ok) {
    if (metricsResult.error.code === "UNAUTHENTICATED") redirect("/sign-out");
    return <ErrorCard code={metricsResult.error.code} />;
  }

  const m = metricsResult.data;
  const tickets = ticketsResult.ok ? ticketsResult.data.items : [];
  const active = m.open + m.in_progress + m.pending_customer;
  const total = active + m.resolved + m.closed;

  const statusData = [
    { name: statusLabel("OPEN", "staff"), value: m.open },
    { name: statusLabel("IN_PROGRESS", "staff"), value: m.in_progress },
    { name: statusLabel("RESOLVED", "staff"), value: m.resolved },
    { name: statusLabel("CLOSED", "staff"), value: m.closed },
  ];

  const priorityData = PRIORITIES.map((p) => ({
    name: priorityLabel(p),
    value: groupTotal(m.by_priority[p]),
  }));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text/60">
        {total} tickets total · {active} still active
      </p>

      {/* Four across, not seven. Seven tiles on a 1440px screen leaves each
          about 150px, which wraps "Average time to resolve" onto three lines
          and makes the row unreadable. Two rows of four and three is the
          honest fit for the number of measures this now carries. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open" value={String(m.open)} accent="structure" />
        <Stat label="In progress" value={String(m.in_progress)} accent="structure" />
        {/* Without this tile the status counts stop summing to the total, and a
            dashboard whose numbers do not add up is one nobody trusts. */}
        <Stat
          label="Waiting on customer"
          value={String(m.pending_customer)}
          hint="SLA clock paused"
          accent="structure"
        />
        <Stat
          label="Overdue"
          value={String(m.breached_open)}
          hint="open past deadline"
          accent={m.breached_open > 0 ? "overdue" : "on-track"}
        />
        <Stat label="Breach rate" value={percent(m.breach_rate)} accent="structure" />
        {/* Two averages side by side, and the labels have to do the work of
            keeping them apart — one is always the smaller of the two. */}
        <Stat
          label="Average time to resolve"
          value={readableDuration(m.avg_resolution_seconds)}
          hint="arrival to resolution"
          accent="structure"
        />
        <Stat
          label="Average working time"
          value={readableDuration(m.avg_working_seconds)}
          hint="excludes waiting on customer"
          accent="structure"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col lg:col-span-1">
          <CardHeader>
            <CardTitle>By status</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-1 flex-col">
            <div className="-mx-2 flex-1">
              <StatusChart data={statusData} />
            </div>
          </CardBody>
        </Card>

        <div className="lg:col-span-2">
          <NeedsAttention tickets={tickets} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By priority &amp; SLA</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-6 lg:grid-cols-3 lg:items-center">
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-text/60">
              SLA health
            </h3>
            <div className="-mx-2">
              <BreachDonut
                breached={m.breached_open}
                healthy={Math.max(active - m.breached_open, 0)}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-text/60">
              Ticket volume
            </h3>
            <div className="-mx-2">
              <PriorityChart data={priorityData} />
            </div>
          </div>

          <div className="overflow-x-auto">
            {/* The table view is the relief that keeps identity off colour alone. */}
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Ticket counts and breach rate by priority</caption>
              <thead>
                <tr className="border-b border-border text-xs text-text/60">
                  <th scope="col" className="py-2">Priority</th>
                  <th scope="col" className="py-2 text-right">Tickets</th>
                  <th scope="col" className="py-2 text-right">Overdue</th>
                  <th scope="col" className="py-2 text-right">Breach rate</th>
                </tr>
              </thead>
              <tbody>
                {PRIORITIES.map((p) => {
                  const row = m.by_priority[p];
                  return (
                    <tr key={p} className="border-b border-border last:border-0">
                      <td className="py-2">{priorityLabel(p)}</td>
                      <td className="py-2 text-right tabular-nums">{groupTotal(row)}</td>
                      <td className="py-2 text-right tabular-nums">{row?.breached_open ?? 0}</td>
                      <td className="py-2 text-right tabular-nums">
                        {percent(row?.breach_rate ?? 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Tabular, not charted: these answer "where is this load coming from",
          which is a lookup, and a second and third bar chart on one screen
          would compete with the two already there. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown
          title="By plan"
          rows={TIERS.map((tier) => ({
            key: tier,
            label: tierLabel(tier),
            row: m.by_tier[tier],
          }))}
        />
        <Breakdown
          title="By category"
          rows={CATEGORIES.map((category) => ({
            key: category,
            label: categoryLabel(category),
            row: m.by_category[category],
          }))}
        />
      </div>
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; label: string; row: GroupMetrics | undefined }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="border-b border-border text-xs text-text/60">
              <th scope="col" className="py-2">Group</th>
              <th scope="col" className="py-2 text-right">Tickets</th>
              <th scope="col" className="py-2 text-right">Overdue</th>
              <th scope="col" className="py-2 text-right">SLA met</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, label, row }) => (
              <tr key={key} className="border-b border-border last:border-0">
                <td className="py-2">{label}</td>
                <td className="py-2 text-right tabular-nums">{groupTotal(row)}</td>
                <td className="py-2 text-right tabular-nums">{row?.breached_open ?? 0}</td>
                <td className="py-2 text-right tabular-nums">{percent(row?.sla_met_rate ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

async function TrendsTab({
  token,
  params,
}: {
  token: string;
  params: Record<string, string | string[] | undefined>;
}) {
  const range = readRange(params);

  const result = await getTimeseries(token, {
    metric: range.metric,
    bucket: range.bucket,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  });

  if (!result.ok) {
    if (result.error.code === "UNAUTHENTICATED") redirect("/sign-out");
    // The 422 over the bucket cap arrives with the backend's own sentence,
    // which already names the limit and the remedy.
    if (result.error.code === "BUSINESS_RULE_VIOLATION") {
      return (
        <Card>
          <CardBody>
            <p className="text-sm text-overdue">{result.error.message}</p>
          </CardBody>
        </Card>
      );
    }
    return <ErrorCard code={result.error.code} />;
  }

  const isRate = range.metric === "breach_rate";
  const seriesLabel = SERIES.find((s) => s.id === range.metric)?.label ?? "Created";

  const points = result.data.points.map((point) => ({
    // Formatted here so the client chart does no date work at all.
    label: new Date(point.bucket_start).toLocaleDateString(undefined, {
      month: "short",
      day: range.bucket === "month" ? undefined : "numeric",
      year: range.bucket === "month" ? "numeric" : undefined,
    }),
    // Rendered as a percentage on a 0–100 axis, not a raw ratio.
    value: isRate ? point.value * 100 : point.value,
  }));

  const total = points.reduce((sum, point) => sum + point.value, 0);

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Metric" className="flex flex-wrap gap-1">
        {SERIES.map((series) => {
          const active = series.id === range.metric;
          return (
            <a
              key={series.id}
              href={`/dashboard?${rangeToParams({ ...range, metric: series.id, tab: "trends" })}`}
              aria-current={active ? "true" : undefined}
              className={[
                "min-h-10 rounded-sm border px-3 py-2 text-sm transition-colors duration-fast",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                active
                  ? "border-transparent bg-control text-text-inverse"
                  : "border-border bg-surface text-text hover:bg-canvas",
              ].join(" ")}
            >
              {series.label}
            </a>
          );
        })}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>
            {seriesLabel} · {describeRange(range)}
          </CardTitle>
        </CardHeader>
        <CardBody>
          {total === 0 ? (
            // The range is restated so the user can see the filter is the cause
            // rather than concluding the dashboard is broken.
            <p className="py-8 text-center text-sm text-text/60">
              No tickets in this period ({describeRange(range)}).
            </p>
          ) : (
            <TrendChart points={points} isRate={isRate} seriesLabel={seriesLabel} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

async function AgentsTab({
  token,
  params,
}: {
  token: string;
  params: Record<string, string | string[] | undefined>;
}) {
  const range = readRange(params);

  const result = await getAgentMetrics(token, {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  });

  if (!result.ok) {
    if (result.error.code === "UNAUTHENTICATED") redirect("/sign-out");
    return <ErrorCard code={result.error.code} />;
  }

  const requested = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const sort: AgentSortKey = SORT_KEYS.includes(requested as AgentSortKey)
    ? (requested as AgentSortKey)
    : "open";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agents · {describeRange(range)}</CardTitle>
      </CardHeader>
      <CardBody>
        <AgentTable
          items={sortAgents(result.data.items, sort)}
          attributionNote={result.data.attribution_note}
          sort={sort}
          sortHref={(key) => {
            const query = rangeToParams({ ...range, tab: "agents" });
            query.set("sort", key);
            return `/dashboard?${query}`;
          }}
        />
      </CardBody>
    </Card>
  );
}
