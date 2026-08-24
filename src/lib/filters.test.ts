import { describe, expect, it } from "vitest";

import {
  applyFilterChange,
  clearFilters,
  hasActiveFilters,
  parseFilters,
  toSearchParams,
} from "./filters";

describe("parseFilters", () => {
  it("reads every supported filter", () => {
    expect(
      parseFilters({
        q: "timeout",
        status: "OPEN",
        priority: "CRITICAL",
        category: "OUTAGE",
        breached: "true",
        assigned: "false",
        escalated: "true",
        tier: "ENTERPRISE",
        assignee_id: "abc",
        created_after: "2026-01-01",
      }),
    ).toEqual({
      q: "timeout",
      status: "OPEN",
      priority: "CRITICAL",
      category: "OUTAGE",
      breached: true,
      assigned: false,
      escalated: true,
      tier: "ENTERPRISE",
      assignee_id: "abc",
      created_after: "2026-01-01",
    });
  });

  it("drops unknown keys", () => {
    expect(parseFilters({ status: "OPEN", nonsense: "x" })).toEqual({ status: "OPEN" });
  });

  it("drops invalid enum values rather than forwarding them", () => {
    // Forwarding earns a 400 from the API for what is almost always a stale or
    // hand-edited URL.
    expect(parseFilters({ status: "NOPE", priority: "URGENT" })).toEqual({});
  });

  it("treats anything other than true/false as absent", () => {
    expect(parseFilters({ breached: "yes" })).toEqual({});
    expect(parseFilters({ breached: "false" })).toEqual({ breached: false });
  });

  it("drops an unparseable date", () => {
    expect(parseFilters({ created_after: "last-tuesday" })).toEqual({});
  });

  it("takes the first value when a key repeats", () => {
    expect(parseFilters({ status: ["OPEN", "CLOSED"] })).toEqual({ status: "OPEN" });
  });

  it("trims and caps the search term", () => {
    expect(parseFilters({ q: "  spaced  " })).toEqual({ q: "spaced" });
    expect(parseFilters({ q: "" })).toEqual({});
    expect(parseFilters({ q: "x".repeat(500) }).q).toHaveLength(200);
  });
});

describe("applyFilterChange", () => {
  it("drops cursor on every change", () => {
    // The load-bearing rule: a cursor encodes a position in one ordering, and
    // the backend 400s it once the query shape changes. Keeping it would break
    // the first interaction after filtering.
    const current = new URLSearchParams("status=OPEN&cursor=abc123");
    expect(applyFilterChange(current, { priority: "HIGH" }).has("cursor")).toBe(false);
  });

  it("drops cursor even when the change removes a filter", () => {
    const current = new URLSearchParams("status=OPEN&cursor=abc123");
    const next = applyFilterChange(current, { status: undefined });
    expect(next.has("cursor")).toBe(false);
    expect(next.has("status")).toBe(false);
  });

  it("treats an empty string as removal", () => {
    const next = applyFilterChange(new URLSearchParams("q=old"), { q: "" });
    expect(next.has("q")).toBe(false);
  });

  it("preserves unrelated params", () => {
    const next = applyFilterChange(new URLSearchParams("status=OPEN&sort=due"), {
      priority: "LOW",
    });
    expect(next.get("sort")).toBe("due");
    expect(next.get("status")).toBe("OPEN");
    expect(next.get("priority")).toBe("LOW");
  });

  it("does not mutate the input", () => {
    const current = new URLSearchParams("cursor=abc");
    applyFilterChange(current, { status: "OPEN" });
    expect(current.get("cursor")).toBe("abc");
  });
});

describe("clearFilters", () => {
  it("removes every filter and the cursor, keeping unrelated params", () => {
    const next = clearFilters(new URLSearchParams("status=OPEN&q=x&cursor=abc&sort=due"));
    expect(next.toString()).toBe("sort=due");
  });
});

describe("round trip", () => {
  it("is lossless through the URL", () => {
    const filters = {
      q: "disk full",
      status: "IN_PROGRESS",
      priority: "HIGH",
      breached: true,
      tier: "BUSINESS",
    } as const;
    const params = toSearchParams(filters);
    expect(parseFilters(Object.fromEntries(params))).toEqual(filters);
  });
});

describe("toSearchParams", () => {
  it("omits explicit nulls, which saved views round-trip", () => {
    // The API models every filter as nullable, so a stored view comes back with
    // nulls. String(null) would put "null" in the URL — and `q=null` would
    // search for the word.
    const params = toSearchParams({
      breached: true,
      q: null,
      status: null,
    } as unknown as Parameters<typeof toSearchParams>[0]);
    expect(params.toString()).toBe("breached=true");
  });
});

describe("hasActiveFilters", () => {
  it("distinguishes an empty filter set", () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ status: "OPEN" })).toBe(true);
  });
});
