import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Dashboard contract checks (spec09 frontend §6).
 *
 * Read from the source rather than rendered: the page is an async Server
 * Component that calls `getSession` (`import "server-only"`) and fetches three
 * endpoints. Rendering it here would mean mocking the session, the fetch layer
 * and `redirect`, and the assertions would then be about the mocks.
 *
 * What is guarded here are decisions visible in the code and easy to undo by
 * accident — a dropped status tile, an averages pair that stops being
 * distinguishable, an export button that loses its role gate.
 */
const SOURCE = readFileSync(resolve("src/app/(staff)/dashboard/page.tsx"), "utf8");

describe("status counts reconcile with the total", () => {
  /**
   * **The trust property.** After spec05 the four v1 statuses no longer sum to
   * the total; a dashboard whose numbers do not add up is one nobody trusts.
   */
  it("counts pending_customer in the active total", () => {
    expect(SOURCE).toContain("m.open + m.in_progress + m.pending_customer");
  });

  it("counts pending_customer in every group breakdown", () => {
    const groupTotal = SOURCE.slice(
      SOURCE.indexOf("function groupTotal"),
      SOURCE.indexOf("function ErrorCard"),
    );
    for (const status of ["open", "in_progress", "pending_customer", "resolved", "closed"]) {
      expect(groupTotal).toContain(`row.${status}`);
    }
  });

  it("gives it its own tile, so the visible numbers add up too", () => {
    expect(SOURCE).toContain('label="Waiting on customer"');
    expect(SOURCE).toContain("String(m.pending_customer)");
  });
});

describe("the two averages", () => {
  /**
   * They answer different questions and one is always smaller. Labels that do
   * not distinguish them would make the pause feature look like a regression in
   * handling time.
   */
  it("are labelled distinguishably", () => {
    expect(SOURCE).toContain('label="Average time to resolve"');
    expect(SOURCE).toContain('label="Average working time"');
  });

  it("each carry a hint saying what they measure", () => {
    expect(SOURCE).toContain('hint="arrival to resolution"');
    expect(SOURCE).toContain('hint="excludes waiting on customer"');
  });

  it("read from the two distinct fields", () => {
    expect(SOURCE).toContain("m.avg_resolution_seconds");
    expect(SOURCE).toContain("m.avg_working_seconds");
  });
});

describe("export", () => {
  it("is gated on ADMIN rather than rendered and left to 403", () => {
    expect(SOURCE).toContain('session.role === "ADMIN" && <ExportButton />');
  });
});

describe("breakdowns", () => {
  it("cover plan and category alongside priority", () => {
    expect(SOURCE).toContain("m.by_tier");
    expect(SOURCE).toContain("m.by_category");
    expect(SOURCE).toContain("m.by_priority");
  });

  it("iterate the canonical enum lists rather than re-listing members", () => {
    // A new tier or category must reach this dashboard without anyone
    // remembering to add it here.
    expect(SOURCE).toContain('from "@/lib/filters"');
    expect(SOURCE).not.toMatch(/const TIERS\s*[:=]/);
    expect(SOURCE).not.toMatch(/const CATEGORIES\s*[:=]/);
  });
});

describe("no client fetch path", () => {
  it("keeps every fetch on the server", () => {
    // The tabs are Server Components; the range and export controls only
    // rewrite the query string. A `fetch(` here would mean the token had to
    // reach the browser.
    expect(SOURCE).not.toContain('"use client"');
    expect(SOURCE).not.toMatch(/\bawait fetch\(/);
  });

  it("drives tabs, range and sort entirely from the URL", () => {
    expect(SOURCE).toContain("searchParams");
    expect(SOURCE).toContain("rangeToParams");
    expect(SOURCE).toContain("readRange");
  });

  it("validates the tab and sort parameters instead of trusting them", () => {
    expect(SOURCE).toContain("TABS.some");
    expect(SOURCE).toContain("SORT_KEYS.includes");
  });
});

describe("trends", () => {
  it("renders a rate as a percentage rather than a raw ratio", () => {
    expect(SOURCE).toContain("isRate ? point.value * 100 : point.value");
  });

  it("restates the range in the empty state, so the filter reads as the cause", () => {
    expect(SOURCE).toContain("No tickets in this period ({describeRange(range)})");
  });

  it("surfaces the backend's own sentence for the bucket cap", () => {
    // The 422 message already names the limit and the remedy; rewriting it here
    // would give two places to keep in step.
    expect(SOURCE).toContain('result.error.code === "BUSINESS_RULE_VIOLATION"');
    expect(SOURCE).toContain("{result.error.message}");
  });
});
