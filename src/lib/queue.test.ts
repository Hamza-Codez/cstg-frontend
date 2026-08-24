import { describe, expect, it } from "vitest";

import { byUrgency } from "./queue";
import type { TicketResponse } from "./types";

const now = Date.UTC(2026, 0, 1, 12, 0, 0);
const HOUR = 3600_000;

const ticket = (over: Partial<TicketResponse> & { id: string }): TicketResponse => ({
  subject: "S",
  category: "GENERAL",
  priority: "LOW",
  status: "OPEN",
  deadline: new Date(now + 10 * HOUR).toISOString(),
  escalation_level: 0,
  sla_breached_at: null,
  created_at: new Date(now - HOUR).toISOString(),
  ...over,
});

describe("byUrgency", () => {
  it("puts overdue first, then at-risk, then on-track (§7.2.1)", () => {
    const order = byUrgency(
      [
        ticket({ id: "on-track", deadline: new Date(now + 40 * HOUR).toISOString() }),
        ticket({ id: "overdue", deadline: new Date(now - HOUR).toISOString() }),
        ticket({ id: "at-risk", deadline: new Date(now + 30 * 60_000).toISOString() }),
      ],
      now,
    ).map((t) => t.id);

    expect(order).toEqual(["overdue", "at-risk", "on-track"]);
  });

  it("breaks ties by soonest deadline", () => {
    const order = byUrgency(
      [
        ticket({ id: "later", deadline: new Date(now + 30 * HOUR).toISOString() }),
        ticket({ id: "sooner", deadline: new Date(now + 20 * HOUR).toISOString() }),
      ],
      now,
    ).map((t) => t.id);

    expect(order).toEqual(["sooner", "later"]);
  });

  it("sinks resolved and closed tickets below active work", () => {
    const order = byUrgency(
      [
        ticket({ id: "resolved", status: "RESOLVED", deadline: new Date(now - 5 * HOUR).toISOString() }),
        ticket({ id: "open", deadline: new Date(now + 40 * HOUR).toISOString() }),
      ],
      now,
    ).map((t) => t.id);

    expect(order).toEqual(["open", "resolved"]);
  });

  it("does not mutate its input", () => {
    const input = [ticket({ id: "a" }), ticket({ id: "b" })];
    const snapshot = input.map((t) => t.id);
    byUrgency(input, now);
    expect(input.map((t) => t.id)).toEqual(snapshot);
  });
});
