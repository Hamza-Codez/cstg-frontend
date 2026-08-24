# spec09.md — F8 Metrics v2 & Export (UI)

**Phase P20 · Wave 3 · Backend: `cstg-backend/spec/spec09.md`**

`(staff)/dashboard` shows current counts and a by-priority breakdown. There is no time axis, so an
admin cannot tell whether today's breach rate is recovery or collapse.

---

## 1. Scope

| Surface | Change |
|---|---|
| `(staff)/dashboard` | Tabs: Overview · Trends · Agents; date range |
| `components/metrics/charts.tsx` | Time-series line, tier/category breakdowns |
| `components/metrics/agent-table.tsx` | New |
| `components/metrics/date-range.tsx` | New |
| `components/ui/tabs.tsx` | New |

---

## 2. Chart Discipline

`docs/UIUX_FRONTEND.md §2.2b` already settled the colour rules and they are not revisited here — they
are restated because every new chart in this phase has to obey them:

- **Categorical** (status, category) → `--chart-1…4`, assigned in fixed order, **never cycled**. If a
  dimension has more members than tokens, it is aggregated with an "Other" bucket, not wrapped around
  the palette.
- **Sequential** (priority) → `--chart-seq-1…4`, light→dark. Priority is ordered, so magnitude reads
  as magnitude.
- **Signalling colours** (`on-track`/`at-risk`/`overdue`) appear in exactly one chart: the SLA-health
  donut, because that chart *is* SLA state.
- **The accent never appears in a chart.** It is CTA-only.
- **Every mark is direct-labelled**, so identity never rests on colour, and the by-priority panel
  keeps its table view beside the chart.

Charts are Recharts, already a dependency. Wrapped in Server Components that fetch, with the chart
itself a small client component — Recharts needs the DOM.

---

## 3. Date Range

`components/metrics/date-range.tsx`, driving all three tabs.

Presets — Last 7 days, Last 30 days, Last 90 days, This month, Custom — because a preset is one click
and covers almost every real question. Custom reveals two native `<input type="date">`.

**Range lives in the URL** (`?from=&to=&bucket=`), for the same reason filters do in spec04: the tabs
are Server Components that fetch with the session token, and a shareable dashboard link is worth
having. No client fetch path is introduced.

Bucket size is chosen automatically from the range — ≤31 days daily, ≤26 weeks weekly, else monthly —
with a manual override. The backend caps at 366 buckets and returns 422; automatic selection means a
user cannot casually hit that, and the override is where they might.

---

## 4. Tabs

### Overview
The existing stat tiles, plus `pending_customer` and `avg_working_seconds`.

`pending_customer` **must** be added: after spec05 the four status counts no longer sum to the total,
and a dashboard whose numbers do not add up is a dashboard nobody trusts.

Two averages sit side by side and need labels that distinguish them, because they answer different
questions and one is always smaller:

| Field | Label | Tooltip |
|---|---|---|
| `avg_resolution_seconds` | "Average time to resolve" | "From when the request arrived to when it was resolved." |
| `avg_working_seconds` | "Average working time" | "Excludes time spent waiting on the customer." |

New breakdowns — by plan (tier) and by category — as tabular panels beside the existing by-priority
one. Tier is categorical, so it takes `--chart-1…4`; there are exactly three tiers, which fits.

### Trends
The time-series line chart. One metric at a time, selected by a segmented control: Created ·
Resolved · Breached · Breach rate.

**Zero-valued buckets render as zero**, never as a gap. The backend emits them explicitly
(`spec09.md §3`) so the chart does not have to guess — and a line that interpolates across a missing
day reports steady activity on a day with none.

Breach rate renders as a percentage on a 0–100% axis, not a raw ratio.

Empty range: "No tickets in this period." with the range restated, so the user can see the filter is
the cause.

### Agents
`components/metrics/agent-table.tsx` — sortable table: agent, open, in progress, waiting on customer,
resolved in period, SLA met rate, average working time, load.

**The attribution caveat is on the screen, not buried in a doc.** A line above the table:

> Tickets count toward whoever is assigned to them now. Reassigned tickets count entirely toward
> their current owner.

This is a performance view of named people. Shipping an approximation without saying so is how a
metric gets managed against and quietly becomes unfair. The backend spec requires the caveat in the
API description; this is where a human reads it.

Inactive agents holding tickets in range are included and marked "Inactive" — otherwise the period's
totals do not reconcile with Overview.

SLA met rate uses the signalling colours, being an SLA measure: ≥95% `on-track`, ≥85% `at-risk`,
below `overdue` — with the number always present, so colour is never the sole signal.

---

## 5. Export

A secondary "Export CSV" button on the dashboard and on `(staff)/tickets`.

It carries **the current filters and date range**, so the export matches what is on screen — the
backend accepts the same filter set for exactly this reason (`spec09.md §6`).

Download goes through a route handler (`app/api/export/tickets/route.ts`) that attaches the token
server-side and **streams** the response through, matching the attachment download pattern in spec03
§5. A large export must not be buffered in the Node process.

The button enters a pending state on click. Streaming means no progress is available, so the copy
sets the expectation: "Preparing your export…". On 422 (over the row cap): "That's more than 50,000
tickets. Narrow the date range and try again." — actionable, naming the actual limit.

Admin-only, matching the endpoint. The button is absent for other roles rather than 403ing.

---

## 6. Tests

`components/metrics/charts.test.tsx`
- Zero buckets render as points, not gaps.
- Priority uses the sequential ramp, status the categorical set; **no chart uses the accent token**.
- Every series is direct-labelled.

`components/metrics/agent-table.test.tsx`
- Attribution caveat renders above the table.
- Inactive agents appear, marked.
- SLA met rate shows the number alongside its colour band at every threshold boundary.

`components/metrics/date-range.test.tsx`
- Presets set `from`/`to` in the URL; bucket auto-selection at 31, 32, and 182 days.
- Custom range beyond the cap surfaces the 422 copy.

`(staff)/dashboard` test
- Status tiles including `pending_customer` sum to the total ticket count.
- Both averages render with distinguishing labels.
- Export button absent for non-admin roles.

---

## 7. Definition of Done

Three tabs behind a URL-driven date range with no client fetch path; status counts reconcile with the
total; the two averages are distinguishable at a glance; zero buckets are visible as zero; chart
colour discipline holds — no accent, no borrowed signalling colours, everything direct-labelled; the
per-agent attribution caveat is on screen; export streams, carries the current filters, and states
its cap.
