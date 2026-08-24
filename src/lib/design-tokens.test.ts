import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the design rules that are easy to violate by habit
 * (docs/UIUX_FRONTEND.md §2.3–2.4, CLAUDE.md golden rule 11).
 *
 * tokens.css is the single home for values; everything else references tokens
 * through Tailwind classes.
 *
 * These checks deliberately use plain string matching rather than regexes with
 * backslash escapes — an earlier version carried a literal backspace where `\b`
 * was meant, so the pattern silently matched nothing and the guard passed while
 * real violations shipped.
 */

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "generated") return [];
      return sourceFiles(full);
    }
    return /\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [full] : [];
  });
}

const FILES = sourceFiles(resolve("src"));

/** Files whose text contains any of the given literal fragments. */
function filesContaining(fragments: string[]): string[] {
  return FILES.filter((file) => {
    const text = readFileSync(file, "utf8");
    return fragments.some((fragment) => text.includes(fragment));
  });
}

/** Radius steps mapped in tailwind.config.ts. Anything else emits no CSS. */
const UNMAPPED_RADII = ["rounded-2xl", "rounded-3xl"];

/** Weights mapped in tailwind.config.ts: 400 / 500 / 600 / 700. */
const UNMAPPED_WEIGHTS = [
  "font-thin",
  "font-extralight",
  "font-light",
  "font-extrabold",
  "font-black",
];

describe("design tokens", () => {
  it("finds source files to check", () => {
    expect(FILES.length).toBeGreaterThan(10);
  });

  it("has no raw hex colour anywhere in TS/TSX", () => {
    const offenders = FILES.filter((f) => /#[0-9a-fA-F]{3,8}/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("uses only radius steps that exist in the scale", () => {
    expect(filesContaining(UNMAPPED_RADII)).toEqual([]);
  });

  it("uses only type weights that exist in the scale", () => {
    expect(filesContaining(UNMAPPED_WEIGHTS)).toEqual([]);
  });

  it("defines every colour and radius token in tokens.css", () => {
    const tokens = readFileSync(resolve("src/styles/tokens.css"), "utf8");
    for (const name of [
      "--color-canvas",
      "--color-surface",
      "--color-structure",
      "--color-accent",
      "--color-accent-hover",
      "--color-text-on-accent",
      "--color-text",
      "--color-text-inverse",
      "--color-border",
      "--color-header",
      "--color-app-bg",
      "--gradient-app",
      "--gradient-header",
      "--gradient-sidebar",
      "--color-on-track",
      "--color-at-risk",
      "--color-overdue",
      "--chart-1",
      "--chart-seq-1",
      "--radius-sm",
      "--radius-md",
      "--radius-lg",
      "--radius-xl",
      "--radius-full",
    ]) {
      expect(tokens).toContain(name);
    }
  });

  it("reserves the accent for CTAs, never for status signalling", () => {
    const badge = readFileSync(resolve("src/components/ui/badge.tsx"), "utf8");
    expect(badge.includes("bg-accent")).toBe(false);
    expect(badge.includes("text-accent")).toBe(false);
  });
});
