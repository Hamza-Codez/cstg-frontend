"use client";

/**
 * Dashboard date range (spec09 frontend §3).
 *
 * A thin client shell over URL state, exactly like `FilterBar`: it fetches
 * nothing and holds no metrics. It rewrites the query string and the Server
 * Component tabs re-render with the new numbers — which is what keeps the
 * session token server-side and introduces no client fetch path.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import {
  BUCKETS,
  PRESETS,
  type PresetId,
  type Range,
  bucketFor,
  describeRange,
  exceedsCap,
  rangeToParams,
  readRange,
  toDateInput,
} from "@/lib/metrics-range";
import type { MetricBucket } from "@/lib/types";

/** Same welded cap as the queue filters, so the two bars read as one family. */
function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="rounded-t-sm bg-gradient-header px-2 py-1 text-xs font-medium text-text-inverse">
        {label}
      </span>
      {children}
    </div>
  );
}

const WELDED = "rounded-t-none rounded-b-sm";

/**
 * A native select with no empty option.
 *
 * `ui/select` always renders a placeholder choice, which is right for a filter
 * — clearing it means "any" — and wrong here: there is no such thing as no
 * period. Same classes, so the two bars still look identical.
 */
function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ id: T; label: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className={`min-h-10 cursor-pointer border border-structure bg-surface px-3 py-2 text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${WELDED}`}
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function DateRange({ tab }: { tab: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = Object.fromEntries(searchParams.entries());
  const range = readRange(params);

  function push(next: Partial<Range>) {
    const merged = { ...range, ...next, tab };
    // Any change to the span re-derives the bucket unless the user pinned one
    // explicitly in this same action — otherwise a 7-day preset would keep the
    // monthly bucket chosen for a 90-day range and render a single point.
    if (next.bucket === undefined && (next.preset || next.from || next.to)) {
      merged.bucket = bucketFor(merged.from, merged.to);
    }
    router.push(`${pathname}?${rangeToParams(merged)}`);
  }

  const over = exceedsCap(range.from, range.to, range.bucket);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <Control label="Period">
          <Choice
            label="Period"
            value={range.preset}
            options={PRESETS}
            onChange={(preset: PresetId) => push({ preset })}
          />
        </Control>

        {range.preset === "custom" && (
          <>
            <Control label="From">
              <input
                type="date"
                aria-label="From"
                className={`min-h-10 border border-border bg-surface px-2 text-sm text-text ${WELDED}`}
                value={toDateInput(range.from)}
                max={toDateInput(range.to)}
                onChange={(event) =>
                  event.target.value &&
                  push({ from: new Date(`${event.target.value}T00:00:00.000Z`) })
                }
              />
            </Control>
            <Control label="To">
              <input
                type="date"
                aria-label="To"
                className={`min-h-10 border border-border bg-surface px-2 text-sm text-text ${WELDED}`}
                value={toDateInput(new Date(range.to.getTime() - 86_400_000))}
                min={toDateInput(range.from)}
                onChange={(event) =>
                  event.target.value &&
                  push({ to: new Date(`${event.target.value}T00:00:00.000Z`) })
                }
              />
            </Control>
          </>
        )}

        <Control label="Grouped by">
          <Choice
            label="Grouped by"
            value={range.bucket}
            options={BUCKETS}
            onChange={(bucket: MetricBucket) => push({ bucket })}
          />
        </Control>

        <p className="min-h-10 self-end py-2 text-xs text-text/60">{describeRange(range)}</p>
      </div>

      {/* Named limit, named remedy. "Too many buckets" would tell the user
          nothing they can act on. */}
      {over && (
        <p role="status" className="text-xs text-overdue">
          That range is more than 366 {range.bucket === "day" ? "days" : `${range.bucket}s`}.
          Narrow the dates, or group by a longer period.
        </p>
      )}
    </div>
  );
}
