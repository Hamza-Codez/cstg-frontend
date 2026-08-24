import { describe, expect, it } from "vitest";

import { formatBytes } from "./format";

describe("formatBytes", () => {
  it("reports bytes below 1 KB without a unit conversion", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(999)).toBe("999 B");
  });

  it("switches unit at exactly 1024, not 1000", () => {
    // Binary units, matching what the OS reports — a file the user sees as
    // "2.4 MB" must not read as 2.5 here.
    expect(formatBytes(1023)).toBe("1023 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
  });

  it("keeps one decimal below ten and drops it above", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(24 * 1024 * 1024)).toBe("24 MB");
  });

  it("formats the upload cap the way the error copy quotes it", () => {
    expect(formatBytes(10 * 1024 * 1024)).toBe("10 MB");
  });

  it("stops at GB rather than inventing larger units", () => {
    expect(formatBytes(3 * 1024 ** 3)).toBe("3.0 GB");
  });
});
