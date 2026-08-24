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
  // `deadline` is the frozen promise; `sla_due_at` is what ordering reads. They
  // start equal and diverge only once a ticket pauses.
  deadline: new Date(now + 10 * HOUR).toISOString(),
  sla_due_at: new Date(now + 10 * HOUR).toISOString(),
  sla_paused_at: null,
  sla_paused_seconds: 0,
  reopen_count: 0,
  resolved_at: null,
  escalation_level: 0,
  sla_breached_at: null,
  created_at: new Date(now - HOUR).toISOString(),
  ...over,
});

describe("byUrgency", () => {
  it("puts overdue first, then at-risk, then on-track (§7.2.1)", () => {
    const order = byUrgency(
      [
        ticket({ id: "on-track", sla_due_at: new Date(now + 40 * HOUR).toISOString() }),
        ticket({ id: "overdue", sla_due_at: new Date(now - HOUR).toISOString() }),
        ticket({ id: "at-risk", sla_due_at: new Date(now + 30 * 60_000).toISOString() }),
      ],
      now,
    ).map((t) => t.id);

    expect(order).toEqual(["overdue", "at-risk", "on-track"]);
  });

  it("breaks ties by soonest deadline", () => {
    const order = byUrgency(
      [
        ticket({ id: "later", sla_due_at: new Date(now + 30 * HOUR).toISOString() }),
        ticket({ id: "sooner", sla_due_at: new Date(now + 20 * HOUR).toISOString() }),
      ],
      now,
    ).map((t) => t.id);

    expect(order).toEqual(["sooner", "later"]);
  });

  it("sinks resolved and closed tickets below active work", () => {
    const order = byUrgency(
      [
        ticket({ id: "resolved", status: "RESOLVED", sla_due_at: new Date(now - 5 * HOUR).toISOString() }),
        ticket({ id: "open", sla_due_at: new Date(now + 40 * HOUR).toISOString() }),
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

  it("sorts paused tickets below on-track, not as overdue (§6)", () => {
    // A paused ticket is nobody's next action. Its stale sla_due_at is long
    // past, so without the paused tier it would float to the very top.
    const order = byUrgency(
      [
        ticket({
          id: "paused",
          status: "PENDING_CUSTOMER",
          sla_due_at: new Date(now - 50 * HOUR).toISOString(),
        }),
        ticket({ id: "on-track", sla_due_at: new Date(now + 40 * HOUR).toISOString() }),
        ticket({ id: "overdue", sla_due_at: new Date(now - HOUR).toISOString() }),
      ],
      now,
    ).map((t) => t.id);

    expect(order).toEqual(["overdue", "on-track", "paused"]);
  });

  it("keeps paused tickets visible rather than filtering them out", () => {
    // An agent needs to see what they are waiting on.
    const result = byUrgency([ticket({ id: "paused", status: "PENDING_CUSTOMER" })], now);
    expect(result).toHaveLength(1);
  });
});
