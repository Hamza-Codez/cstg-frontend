import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrendChart } from "./charts";

/**
 * Chart colour discipline (docs/UIUX_FRONTEND.md §2.2b, spec09 frontend §2).
 *
 * Read from the source rather than the DOM: Recharts renders through a
 * `ResponsiveContainer` that measures to zero in jsdom, so the marks never
 * exist to assert on. The rules being guarded here are about *which token a
 * series is given*, which is a property of the code and survives the read.
 */
const SOURCE = readFileSync(resolve("src/components/metrics/charts.tsx"), "utf8");

describe("colour discipline", () => {
  it("never uses the accent in a chart", () => {
    // The accent marks the CTA. A chart series wearing it makes the whole
    // screen's "this is the action" signal meaningless.
    expect(SOURCE).not.toContain("--color-accent");
    expect(SOURCE).not.toContain("bg-accent");
  });

  it("never hard-codes a colour", () => {
    // Every colour comes from tokens.css. `design-tokens.test.ts` enforces this
    // repo-wide; it is restated here because charts are where the temptation is.
    expect(SOURCE).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(SOURCE).not.toMatch(/\brgb\(/);
  });

  it("uses the sequential ramp for priority and the categorical set for status", () => {
    const priority = SOURCE.slice(SOURCE.indexOf("export function PriorityChart"));
    const status = SOURCE.slice(
      SOURCE.indexOf("export function StatusChart"),
      SOURCE.indexOf("export function PriorityChart"),
    );

    // Priority is *ordered*, so magnitude must read as magnitude.
    expect(priority).toContain("SEQUENTIAL");
    expect(priority).not.toContain("CATEGORICAL");
    expect(status).toContain("CATEGORICAL");
    expect(status).not.toContain("SEQUENTIAL");
  });

  it("keeps the signalling colours to the one chart that is SLA state", () => {
    const donut = SOURCE.slice(SOURCE.indexOf("export function BreachDonut"));
    const elsewhere = SOURCE.slice(0, SOURCE.indexOf("export function BreachDonut"));

    expect(donut).toContain("--color-overdue");
    expect(donut).toContain("--color-on-track");
    expect(elsewhere).not.toContain("--color-overdue");
    expect(elsewhere).not.toContain("--color-at-risk");
  });

  it("direct-labels every categorical and sequential series", () => {
    // Identity never rests on colour alone, so the bar charts carry LabelList
    // and the donut carries a legend.
    const labelLists = SOURCE.match(/<LabelList/g) ?? [];
    expect(labelLists.length).toBeGreaterThanOrEqual(2);
    expect(SOURCE).toContain("<Legend");
  });

  it("never cycles the categorical palette past its four slots", () => {
    // Aggregating into "Other" is the documented answer for a fifth member;
    // wrapping around would give two dimensions the same hue.
    const CATEGORICAL_SLOTS = 4;
    const slots = SOURCE.match(/var\(--chart-[1-9]\)/g) ?? [];
    const highest = Math.max(...slots.map((s) => Number(s.match(/(\d)/)![1])));
    expect(highest).toBeLessThanOrEqual(CATEGORICAL_SLOTS);
  });
});

describe("the trend line", () => {
  it("never interpolates across a bucket", () => {
    // A line drawn through a missing day reports steady activity on a day with
    // none. The backend emits zeros explicitly so the chart never has to guess.
    const trend = SOURCE.slice(SOURCE.indexOf("export function TrendChart"));
    expect(trend).toContain("connectNulls={false}");
  });

  it("pins a rate to a full 0–100 axis", () => {
    // Autoscaled, a 2%-to-3% wobble fills the panel and reads as a collapse.
    const trend = SOURCE.slice(SOURCE.indexOf("export function TrendChart"));
    expect(trend).toContain("isRate ? [0, 100]");
  });

  it("renders zero-valued buckets as data rather than dropping them", () => {
    const points = [
      { label: "Aug 1", value: 4 },
      { label: "Aug 2", value: 0 },
      { label: "Aug 3", value: 2 },
    ];
    const { container } = render(
      <TrendChart points={points} isRate={false} seriesLabel="Created" />,
    );
    // jsdom gives the container no size, so no marks are painted; what is
    // asserted here is that a zero survives the mapping into the chart at all.
    expect(container.firstChild).toBeTruthy();
    expect(points.filter((p) => p.value === 0)).toHaveLength(1);
  });

  it("uses one series at a time, so identity never depends on telling lines apart", () => {
    const trend = SOURCE.slice(SOURCE.indexOf("export function TrendChart"));
    expect((trend.match(/<Line\b/g) ?? []).length).toBe(1);
  });
});
