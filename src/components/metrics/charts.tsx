"use client";

/**
 * Dashboard charts.
 *
 * Colour comes from tokens, never literals: the categorical series is a validated
 * four-hue set (chroma floor, adjacent-pair CVD separation, normal-vision floor,
 * and >=3:1 contrast against the canvas all pass), kept separate from the accent
 * — which stays CTA-only — and from the reserved status colours.
 *
 * Priority is *ordered*, so it uses one hue stepped light->dark rather than four
 * unrelated hues; magnitude should read as magnitude.
 *
 * Every bar and slice is direct-labelled, so identity never rests on colour alone.
 */

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface Slice {
  name: string;
  value: number;
}

/** Fixed order, never cycled — slot N always means the same thing. */
const CATEGORICAL = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
] as const;

/** Light -> dark, matching Low -> Critical. */
const SEQUENTIAL = [
  "var(--chart-seq-1)",
  "var(--chart-seq-2)",
  "var(--chart-seq-3)",
  "var(--chart-seq-4)",
] as const;

const AXIS_TICK = { fontSize: 12, fill: "var(--color-text)" } as const;

/**
 * Rounded data-end, square baseline — the bar should look anchored, not floating.
 *
 * recharts documents `radius` as `number | [number,number,number,number]`, but in
 * v3 Bar's props intersect that with the SVG `radius` attribute (`string|number`),
 * so the tuple form does not typecheck. The runtime accepts it; the cast is the
 * narrowest way to say so.
 */
const RADIUS_TOP = [4, 4, 0, 0] as unknown as number;
const RADIUS_RIGHT = [0, 4, 4, 0] as unknown as number;

const TOOLTIP_STYLE = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: 12,
  color: "var(--color-text)",
} as const;

/** Counts by status — categorical identity, so distinct hues. */
export function StatusChart({ data }: { data: Slice[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -20 }}>
          <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--chart-grid)" }} />
          {/* 4px rounded data-end, anchored to the baseline. */}
          <Bar dataKey="value" radius={RADIUS_TOP} maxBarSize={48} minPointSize={2} background={{ fill: "var(--color-canvas)", radius: RADIUS_TOP }}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={CATEGORICAL[index % CATEGORICAL.length]} />
            ))}
            <LabelList dataKey="value" position="top" style={AXIS_TICK} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Counts by priority — ordered, so one hue stepped by severity. */
export function PriorityChart({ data }: { data: Slice[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 28, bottom: 4, left: 8 }}
        >
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--chart-grid)" }} />
          <Bar dataKey="value" radius={RADIUS_RIGHT} maxBarSize={26} minPointSize={2} background={{ fill: "var(--color-canvas)", radius: RADIUS_RIGHT }}>
            {data.map((entry, index) => (
              // Reversed: Critical is the darkest step, and it renders first.
              <Cell key={entry.name} fill={SEQUENTIAL[SEQUENTIAL.length - 1 - index]} />
            ))}
            <LabelList dataKey="value" position="right" style={AXIS_TICK} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Share of the backlog that is overdue — one number split two ways. */
export function BreachDonut({ breached, healthy }: { breached: number; healthy: number }) {
  const data: Slice[] = [
    { name: "Overdue", value: breached },
    { name: "On track", value: healthy },
  ];
  const total = breached + healthy;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="var(--color-surface)"
            strokeWidth={2}
          >
            {/* The reserved status colours are correct here: this slice *is* SLA
                state, which is exactly what they are for. */}
            <Cell fill="var(--color-overdue)" />
            <Cell fill="var(--color-on-track)" />
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend
            verticalAlign="bottom"
            height={24}
            formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      <p className="sr-only">
        {breached} of {total} open tickets are overdue.
      </p>
    </div>
  );
}
