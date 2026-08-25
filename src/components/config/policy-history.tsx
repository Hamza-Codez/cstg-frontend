import "server-only";

/**
 * SLA policy history (spec06 frontend §4).
 *
 * Read-only, because versions are immutable — there is nothing to edit and no
 * row-level action. Reference material for answering "why did this ticket have
 * a six-hour window", not something an admin reads daily, so it sits collapsed
 * beneath the form.
 */

import { formatDateTime } from "@/lib/format";
import { priorityLabel } from "@/lib/labels";
import type { Priority, SlaPolicyVersionSummary } from "@/lib/types";

const ORDER: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function hours(seconds: number): string {
  const value = seconds / 3600;
  return Number.isInteger(value) ? `${value}h` : `${value.toFixed(2).replace(/\.?0+$/, "")}h`;
}

export function PolicyHistory({ versions }: { versions: SlaPolicyVersionSummary[] }) {
  if (versions.length === 0) {
    return <p className="text-sm text-text/60">No history yet.</p>;
  }

  return (
    <details className="rounded-sm border border-border bg-surface">
      <summary className="cursor-pointer px-3 py-2 text-sm text-text">
        Previous response times ({versions.length})
      </summary>
      <ul className="flex flex-col gap-2 border-t border-border p-3">
        {versions.map((version) => {
          const bySeconds = new Map(version.durations.map((d) => [d.priority, d.seconds]));
          return (
            <li key={version.version_id} className="flex flex-col gap-1 text-sm">
              <span className="flex flex-wrap items-center gap-2">
                <time className="text-text">
                  {version.activated_at ? formatDateTime(version.activated_at) : "Not activated"}
                </time>
                {version.is_active && (
                  <span className="rounded-full bg-on-track px-2 py-0.5 text-xs text-text-inverse">
                    Active
                  </span>
                )}
              </span>
              {version.note && <span className="text-xs text-text/60">{version.note}</span>}
              <span className="text-xs text-text/60">
                {ORDER.map(
                  (p) => `${priorityLabel(p)} ${hours(bySeconds.get(p) ?? 0)}`,
                ).join(" · ")}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
