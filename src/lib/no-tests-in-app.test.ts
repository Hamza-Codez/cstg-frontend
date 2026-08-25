import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * **No test files under `src/app/`.**
 *
 * `next build` walks the app directory when it collects page data. A test file
 * in that tree fails the production build with
 *
 *     unhandledRejection [Error [PageNotFoundError]: Cannot find module for page: /_document]
 *
 * which names neither the file nor the real cause, and which `npm run lint`,
 * `tsc --noEmit` and `vitest` all pass straight through — the whole gate stays
 * green while the thing that ships is broken. It cost a bisect to find once;
 * this test is so it costs nothing the next time.
 *
 * Tests for a page live beside the component they exercise instead
 * (`components/metrics/dashboard-page.test.ts`), or in `lib/` when what they
 * pin down is a pure helper (`lib/stale-action.test.ts`).
 */
const APP_DIR = resolve("src/app");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("the app directory", () => {
  it("contains no test files, which would break `next build`", () => {
    const offenders = walk(APP_DIR)
      .filter((file) => /\.(test|spec)\.[jt]sx?$/.test(file))
      .map((file) => relative(resolve("."), file));

    expect(offenders).toEqual([]);
  });

  it("contains no file importing node:fs, which only a test would need", () => {
    // The narrower symptom of the same problem: a server-only Node import in
    // the routable tree is a page-data-collection hazard even without the
    // `.test.` suffix.
    const offenders = walk(APP_DIR)
      .filter((file) => /\.[jt]sx?$/.test(file))
      .filter((file) => /from "node:fs"|require\("node:fs"\)/.test(readFileSync(file, "utf8")))
      .map((file) => relative(resolve("."), file));

    expect(offenders).toEqual([]);
  });
});
