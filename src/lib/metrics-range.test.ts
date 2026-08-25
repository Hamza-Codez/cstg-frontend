import { describe, expect, it } from "vitest";

import {
  MAX_BUCKETS,
  bucketCount,
  bucketFor,
  describeRange,
  exceedsCap,
  rangeForPreset,
  rangeToParams,
  readRange,
} from "./metrics-range";

const DAY = 86_400_000;
const TODAY = new Date("2026-08-25T14:30:00.000Z");

function span(days: number): { from: Date; to: Date } {
  const to = new Date("2026-08-26T00:00:00.000Z");
  return { from: new Date(to.getTime() - days * DAY), to };
}

describe("bucket auto-selection", () => {
  /**
   * The boundaries are the whole point: automatic selection is what keeps a
   * user from casually hitting the backend's 366-point cap, and it only does
   * that if the thresholds are where they are documented to be (spec09 §3).
   */
  it("switches from daily to weekly between 31 and 32 days", () => {
    const at31 = span(31);
    const at32 = span(32);
    expect(bucketFor(at31.from, at31.to)).toBe("day");
    expect(bucketFor(at32.from, at32.to)).toBe("week");
  });

  it("switches from weekly to monthly after 26 weeks", () => {
    const at182 = span(182);
    const at183 = span(183);
    expect(bucketFor(at182.from, at182.to)).toBe("week");
    expect(bucketFor(at183.from, at183.to)).toBe("month");
  });

  it("keeps every automatic choice comfortably under the cap", () => {
    for (const days of [1, 7, 31, 32, 182, 183, 365, 3650]) {
      const { from, to } = span(days);
      const bucket = bucketFor(from, to);
      expect(exceedsCap(from, to, bucket)).toBe(false);
    }
  });
});

describe("the cap", () => {
  it("is only reachable through a manual bucket override", () => {
    // Ten years is fine monthly; the same range forced to daily is not, and
    // that is exactly where the 422 copy earns its place.
    const { from, to } = span(3650);
    expect(exceedsCap(from, to, "month")).toBe(false);
    expect(exceedsCap(from, to, "day")).toBe(true);
  });

  it("counts buckets the way the backend does", () => {
    const { from, to } = span(MAX_BUCKETS);
    expect(bucketCount(from, to, "day")).toBe(MAX_BUCKETS);
    expect(exceedsCap(from, to, "day")).toBe(false);

    const oneMore = span(MAX_BUCKETS + 1);
    expect(exceedsCap(oneMore.from, oneMore.to, "day")).toBe(true);
  });
});

describe("presets", () => {
  it("ends the range at tomorrow's boundary so today is included", () => {
    // A `to` of "now" would drop the rest of today the moment the page
    // rendered, and a ticket opened an hour ago would vanish from the chart.
    const { to } = rangeForPreset("7d", TODAY);
    expect(to.toISOString()).toBe("2026-08-26T00:00:00.000Z");
  });

  it("spans exactly the named number of days", () => {
    const { from, to } = rangeForPreset("30d", TODAY);
    expect((to.getTime() - from.getTime()) / DAY).toBe(30);
  });

  it("starts this month on the first", () => {
    const { from } = rangeForPreset("mtd", TODAY);
    expect(from.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });
});

describe("reading the URL", () => {
  it("defaults to the last 30 days grouped daily", () => {
    const range = readRange({}, TODAY);
    expect(range.preset).toBe("30d");
    expect(range.bucket).toBe("day");
    expect(range.metric).toBe("created");
  });

  it("never throws on a hand-edited or stale link", () => {
    // A malformed link should render the default dashboard, not an error page.
    const range = readRange(
      { preset: "eternity", bucket: "fortnight", metric: "profit", from: "not-a-date" },
      TODAY,
    );
    expect(range.preset).toBe("30d");
    expect(range.bucket).toBe("day");
    expect(range.metric).toBe("created");
  });

  it("honours a custom range and includes its final day", () => {
    const range = readRange(
      { preset: "custom", from: "2026-01-01", to: "2026-01-31" },
      TODAY,
    );
    expect(range.from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    // Exclusive upper bound: the 31st is inside the range.
    expect(range.to.toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });

  it("swaps an inverted custom range rather than 422ing at the backend", () => {
    const range = readRange(
      { preset: "custom", from: "2026-03-01", to: "2026-01-01" },
      TODAY,
    );
    expect(range.from.getTime()).toBeLessThan(range.to.getTime());
  });

  it("lets an explicit bucket override the automatic choice", () => {
    const range = readRange({ preset: "7d", bucket: "month" }, TODAY);
    expect(range.bucket).toBe("month");
  });

  it("takes the first value when a parameter repeats", () => {
    const range = readRange({ metric: ["resolved", "breached"] }, TODAY);
    expect(range.metric).toBe("resolved");
  });
});

describe("writing the URL", () => {
  it("round-trips through readRange", () => {
    const original = readRange({ preset: "custom", from: "2026-05-01", to: "2026-05-20" }, TODAY);
    const params = Object.fromEntries(rangeToParams(original).entries());
    const again = readRange(params, TODAY);

    expect(again.from.toISOString()).toBe(original.from.toISOString());
    expect(again.to.toISOString()).toBe(original.to.toISOString());
    expect(again.bucket).toBe(original.bucket);
  });

  it("omits explicit dates for a preset, so the preset stays relative", () => {
    // Sharing a "last 7 days" link should mean last 7 days to the recipient,
    // not the sender's seven days frozen in the URL.
    const params = rangeToParams(readRange({ preset: "7d" }, TODAY));
    expect(params.get("preset")).toBe("7d");
    expect(params.has("from")).toBe(false);
  });

  it("keeps the active tab", () => {
    const params = rangeToParams({ ...readRange({}, TODAY), tab: "agents" });
    expect(params.get("tab")).toBe("agents");
  });
});

describe("describeRange", () => {
  it("names the last day inside the range, not the exclusive bound", () => {
    const range = readRange({ preset: "custom", from: "2026-01-01", to: "2026-01-31" }, TODAY);
    // The upper bound is Feb 1; a user told "Jan 1 – Feb 1" would reasonably
    // expect February data in the chart.
    expect(describeRange(range)).toContain("31");
    expect(describeRange(range)).not.toContain("Feb");
  });
});
