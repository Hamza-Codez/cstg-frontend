import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AgentMetrics } from "@/lib/types";

import { AgentTable, type AgentSortKey, sortAgents } from "./agent-table";

const NOTE =
  "Tickets count toward whoever is assigned to them now. Reassigned tickets count " +
  "entirely toward their current owner.";

function agent(overrides: Partial<AgentMetrics> = {}): AgentMetrics {
  return {
    agent: { id: crypto.randomUUID(), name: "Ada Lovelace", is_active: true },
    open_tickets: 3,
    in_progress: 2,
    pending_customer: 1,
    resolved_in_period: 10,
    sla_met_rate: 0.97,
    avg_working_seconds: 4100,
    current_load_pct: 0.6,
    ...overrides,
  } as AgentMetrics;
}

function renderTable(items: AgentMetrics[], sort: AgentSortKey = "open") {
  return render(
    <AgentTable
      items={items}
      attributionNote={NOTE}
      sort={sort}
      sortHref={(key) => `/dashboard?tab=agents&sort=${key}`}
    />,
  );
}

describe("the attribution caveat", () => {
  /**
   * **Non-negotiable.** This is a performance view of named people. Shipping an
   * approximation without saying so is how a metric gets managed against and
   * quietly becomes unfair (spec09 frontend §4).
   */
  it("renders above the table, not in a tooltip", () => {
    renderTable([agent()]);
    const caveat = screen.getByText(/count entirely toward their current owner/i);
    expect(caveat).toBeInTheDocument();
    // Ahead of the table in document order, so it is read before the numbers.
    expect(caveat.compareDocumentPosition(screen.getByRole("table"))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});

describe("inactive agents", () => {
  it("appear, and are marked", () => {
    // Dropping them would make the period's totals stop reconciling with
    // Overview, and a departed agent's history is what a period report is for.
    renderTable([
      agent({ agent: { id: "1", name: "Grace Hopper", is_active: false } }),
    ]);
    const row = screen.getByText("Grace Hopper").closest("tr");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText("Inactive")).toBeInTheDocument();
  });
});

describe("SLA met rate", () => {
  it.each([
    [0.95, "text-on-track", "on track"],
    [0.949, "text-at-risk", "at risk"],
    [0.85, "text-at-risk", "at risk"],
    [0.849, "text-overdue", "below target"],
  ])("at %s uses %s and still prints the number", (rate, className, spoken) => {
    // Colour is never the sole signal: the percentage is always rendered, and
    // the band is named for screen readers.
    renderTable([agent({ sla_met_rate: rate as number })]);
    const cell = screen.getByText(`${Math.round((rate as number) * 100)}%`);
    expect(cell).toHaveClass(className as string);
    expect(screen.getByText(new RegExp(spoken as string))).toBeInTheDocument();
  });

  it("shows a dash rather than 0% when nothing was resolved", () => {
    // A 0% with no denominator reads as failure rather than absence of data.
    renderTable([agent({ resolved_in_period: 0, sla_met_rate: 0 })]);
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });
});

describe("load", () => {
  it("says 'No limit' rather than 0% when no ceiling is set", () => {
    // 0% would read as idle, which is a lie about an uncapped agent holding
    // forty tickets.
    renderTable([agent({ current_load_pct: null })]);
    expect(screen.getByText("No limit")).toBeInTheDocument();
  });

  it("flags an over-capacity agent", () => {
    renderTable([agent({ current_load_pct: 1.5 })]);
    expect(screen.getByText("150%")).toHaveClass("text-overdue");
  });
});

describe("sorting", () => {
  it("marks the active column on the header cell, where aria-sort is valid", () => {
    renderTable([agent()], "sla");
    const header = screen.getByRole("columnheader", { name: /SLA met/i });
    expect(header).toHaveAttribute("aria-sort", "descending");
  });

  it("sorts uncapped agents last by load rather than treating them as idle", () => {
    const capped = agent({
      agent: { id: "a", name: "Capped", is_active: true },
      current_load_pct: 0.2,
    });
    const uncapped = agent({
      agent: { id: "b", name: "Uncapped", is_active: true },
      current_load_pct: null,
    });

    const sorted = sortAgents([uncapped, capped], "load");
    expect(sorted[0].agent.name).toBe("Capped");
    expect(sorted[1].agent.name).toBe("Uncapped");
  });

  it("sorts names alphabetically and counts descending", () => {
    const a = agent({ agent: { id: "a", name: "Zoe", is_active: true }, open_tickets: 1 });
    const b = agent({ agent: { id: "b", name: "Alan", is_active: true }, open_tickets: 9 });

    expect(sortAgents([a, b], "name")[0].agent.name).toBe("Alan");
    expect(sortAgents([a, b], "open")[0].agent.name).toBe("Alan");
  });

  it("does not mutate its input", () => {
    const rows = [
      agent({ agent: { id: "a", name: "Zoe", is_active: true } }),
      agent({ agent: { id: "b", name: "Alan", is_active: true } }),
    ];
    sortAgents(rows, "name");
    expect(rows[0].agent.name).toBe("Zoe");
  });
});

describe("empty state", () => {
  it("says nobody held tickets rather than rendering a headed but empty table", () => {
    renderTable([]);
    expect(screen.getByText(/No agents held tickets in this period/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
