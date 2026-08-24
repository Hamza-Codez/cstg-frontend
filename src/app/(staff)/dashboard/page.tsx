import { redirect } from "next/navigation";

import { BreachDonut, PriorityChart, StatusChart } from "@/components/metrics/charts";
import { NeedsAttention } from "@/components/metrics/needs-attention";
import { Stat } from "@/components/metrics/stat";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { getMetrics } from "@/lib/api/admin";
import { getSession } from "@/lib/auth/session";
import { listTickets } from "@/lib/api/tickets";
import { priorityLabel, statusLabel } from "@/lib/labels";
import type { Priority } from "@/lib/types";

export const metadata = { title: "Dashboard · Support Engine" };

const PRIORITIES: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function percent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function readableDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const [metricsResult, ticketsResult] = await Promise.all([
    getMetrics(session.token),
    listTickets(session.token, { status: "OPEN", limit: 5 }),
  ]);

  if (!metricsResult.ok) {
    if (metricsResult.error.code === "UNAUTHENTICATED") redirect("/sign-out");
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-overdue">
            {metricsResult.error.code === "FORBIDDEN"
              ? "You don't have access to this."
              : "Something went wrong on our end. Try again."}
          </p>
        </CardBody>
      </Card>
    );
  }

  const m = metricsResult.data;
  const tickets = ticketsResult.ok ? ticketsResult.data.items : [];
  const active = m.open + m.in_progress;
  const settled = m.resolved + m.closed;

  const statusData = [
    { name: statusLabel("OPEN", "staff"), value: m.open },
    { name: statusLabel("IN_PROGRESS", "staff"), value: m.in_progress },
    { name: statusLabel("RESOLVED", "staff"), value: m.resolved },
    { name: statusLabel("CLOSED", "staff"), value: m.closed },
  ];

  const priorityData = PRIORITIES.map((p) => {
    const row = m.by_priority[p];
    return {
      name: priorityLabel(p),
      value: row ? row.open + row.in_progress + row.resolved + row.closed : 0,
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-medium">Dashboard</h1>
        <p className="text-xs text-text/60">
          {active + settled} tickets total · {active} still active
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Open" value={String(m.open)} accent="structure" />
        <Stat label="In progress" value={String(m.in_progress)} accent="structure" />
        <Stat
          label="Overdue"
          value={String(m.breached_open)}
          hint="open past deadline"
          accent={m.breached_open > 0 ? "overdue" : "on-track"}
        />
        <Stat label="Breach rate" value={percent(m.breach_rate)} accent="accent" />
        <Stat
          label="Avg. resolution"
          value={readableDuration(m.avg_resolution_seconds)}
          hint={`${settled} resolved`}
          accent="accent"
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
          <CardTitle>By priority & SLA</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-6 lg:grid-cols-3 lg:items-center">
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-text/60">
              SLA health
            </h3>
            <div className="-mx-2">
              <BreachDonut breached={m.breached_open} healthy={Math.max(active - m.breached_open, 0)} />
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
                  const total = row ? row.open + row.in_progress + row.resolved + row.closed : 0;
                  return (
                    <tr key={p} className="border-b border-border last:border-0">
                      <td className="py-2">{priorityLabel(p)}</td>
                      <td className="py-2 text-right tabular-nums">{total}</td>
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
    </div>
  );
}
