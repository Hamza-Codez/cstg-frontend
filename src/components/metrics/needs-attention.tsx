import Link from "next/link";

import { SlaCountdown } from "@/components/sla/sla-countdown";
import { categoryLabel, priorityLabel } from "@/lib/labels";
import type { TicketResponse } from "@/lib/types";

export function NeedsAttention({ tickets }: { tickets: TicketResponse[] }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between bg-structure px-4 py-3 text-sm font-medium text-text-inverse">
        <span>Needs attention</span>
        <Link href="/tickets" className="text-xs hover:underline opacity-80">
          All tickets &rarr;
        </Link>
      </div>
      
      <div className="flex flex-col">
        {tickets.length === 0 ? (
          <div className="p-4 text-center text-sm text-text/60">No tickets need attention.</div>
        ) : (
          tickets.map((t) => {
            // Map priority to the theme colors
            const priorityColor = 
              t.priority === "CRITICAL" ? "var(--chart-seq-4)" :
              t.priority === "HIGH" ? "var(--chart-seq-3)" :
              t.priority === "MEDIUM" ? "var(--chart-seq-2)" :
              "var(--chart-seq-1)";

            return (
              <Link 
                key={t.id} 
                href={`/tickets/${t.id}`}
                className="flex items-center border-b border-border p-3 last:border-0 hover:bg-canvas/50 transition-colors group"
              >
                {/* Left color bar */}
                <div 
                  className="mr-3 h-10 w-1.5 shrink-0 rounded-full" 
                  style={{ backgroundColor: priorityColor }} 
                  aria-hidden 
                />
                
                {/* Main content */}
                <div className="flex flex-1 flex-col truncate">
                  <span className="truncate text-sm font-medium text-text group-hover:text-structure">
                    {t.subject}
                  </span>
                  <span className="truncate text-xs text-text/60">
                    {categoryLabel(t.category)} · {priorityLabel(t.priority)}
                  </span>
                </div>
                
                {/* Right side: SLA */}
                {/* Shared countdown: it ticks, applies the at-risk band, and stops
                    counting on terminal tickets — none of which a local helper did. */}
                <div className="ml-4 shrink-0">
                  <SlaCountdown
                    dueAt={t.sla_due_at}
                        status={t.status}
                    createdAt={t.created_at}
                    audience="staff"
                    settled={t.status === "RESOLVED" || t.status === "CLOSED"}
                  />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
