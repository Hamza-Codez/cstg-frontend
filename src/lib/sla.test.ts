import { describe, expect, it } from "vitest";

import { formatDuration } from "./format";
import { slaState } from "./sla";

const HOUR = 3600_000;
const now = Date.UTC(2026, 0, 1, 12, 0, 0);
const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();

describe("slaState", () => {
  it("is on-track with plenty of time left", () => {
    expect(slaState(iso(10 * HOUR), now, iso(-2 * HOUR))).toBe("on-track");
  });

  it("is at-risk under an hour left", () => {
    expect(slaState(iso(30 * 60_000), now, iso(-23 * HOUR))).toBe("at-risk");
  });

  it("is at-risk under a quarter of the window (§5)", () => {
    // 72h window, 10h left = 13.9% remaining.
    expect(slaState(iso(10 * HOUR), now, iso(-62 * HOUR))).toBe("at-risk");
  });

  it("is overdue exactly past the deadline", () => {
    expect(slaState(iso(-1), now, iso(-24 * HOUR))).toBe("overdue");
  });

  it("treats the deadline instant itself as not yet overdue", () => {
    // SLA_ENGINE.md §1: breach is `now > deadline`, strictly after — so at the
    // exact deadline the ticket is at-risk, not overdue.
    expect(slaState(iso(0), now, iso(-24 * HOUR))).not.toBe("overdue");
  });
});

describe("formatDuration", () => {
  it("is coarse — days and hours, or hours and minutes", () => {
    expect(formatDuration(3 * 24 * HOUR + 4 * HOUR)).toBe("3d 4h");
    expect(formatDuration(2 * HOUR + 41 * 60_000)).toBe("2h 41m");
    expect(formatDuration(12 * 60_000)).toBe("12m");
  });

  it("reports magnitude for an overdue (negative) duration", () => {
    expect(formatDuration(-(1 * HOUR + 20 * 60_000))).toBe("1h 20m");
  });
});

describe("paused (P16)", () => {
  it("returns paused for PENDING_CUSTOMER however far past due", () => {
    // sla_due_at holds its pre-pause value and is stale by design. Without the
    // paused branch that staleness would render as lateness.
    expect(slaState(iso(-365 * 24 * HOUR), now, undefined, "PENDING_CUSTOMER")).toBe("paused");
  });

  it("is checked ahead of overdue and at-risk", () => {
    expect(slaState(iso(60_000), now, undefined, "PENDING_CUSTOMER")).toBe("paused");
  });

  it("leaves every other status behaving exactly as before", () => {
    expect(slaState(iso(-1000), now, undefined, "IN_PROGRESS")).toBe("overdue");
    expect(slaState(iso(-1000), now)).toBe("overdue");
  });
});
