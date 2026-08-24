import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  categoryLabel,
  commentTypeLabel,
  priorityLabel,
  roleLabel,
  statusLabel,
} from "./labels";

/**
 * Extract an enum's members straight from the generated contract, so a backend
 * rename fails this test instead of silently rendering `undefined`
 * (docs/FRONTEND_STRUCTURE.md §6).
 */
function contractEnum(name: string): string[] {
  // Resolved from the project root: under jsdom, import.meta.url is not a file URL.
  const schema = readFileSync(resolve("src/lib/api/generated/schema.d.ts"), "utf8");
  // Line form in the generated file: `Name: "A" | "B" | "C";`
  const line = schema
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .find((l) => l.startsWith(name + ': "'));
  if (!line) throw new Error(`enum ${name} not found in generated schema`);
  return [...line.matchAll(/"([A-Z_]+)"/g)].map((m) => m[1]);
}

describe("label map has no gaps", () => {
  it("covers every TicketStatus for both audiences", () => {
    for (const status of contractEnum("TicketStatus")) {
      expect(statusLabel(status as never, "customer")).toBeTruthy();
      expect(statusLabel(status as never, "staff")).toBeTruthy();
    }
  });

  it("covers every Priority", () => {
    for (const p of contractEnum("Priority")) expect(priorityLabel(p as never)).toBeTruthy();
  });

  it("covers every Category", () => {
    for (const c of contractEnum("Category")) expect(categoryLabel(c as never)).toBeTruthy();
  });

  it("covers every Role", () => {
    for (const r of contractEnum("Role")) expect(roleLabel(r as never)).toBeTruthy();
  });

  it("covers every CommentType", () => {
    for (const t of contractEnum("CommentType")) expect(commentTypeLabel(t as never)).toBeTruthy();
  });
});

describe("audience wording", () => {
  it("softens status wording for customers (§4)", () => {
    expect(statusLabel("OPEN", "customer")).toBe("Received");
    expect(statusLabel("OPEN", "staff")).toBe("Open");
  });

  it("never renders a raw enum name", () => {
    const rendered = [
      statusLabel("IN_PROGRESS", "customer"),
      statusLabel("IN_PROGRESS", "staff"),
      categoryLabel("OUTAGE"),
      commentTypeLabel("INTERNAL_NOTE"),
    ];
    for (const text of rendered) {
      expect(text).not.toMatch(/^[A-Z_]+$/);
    }
  });
});

describe("P16 lifecycle vocabulary", () => {
  it("labels PENDING_CUSTOMER for both audiences", () => {
    // A missing label renders an enum name to a user, so this is a table check
    // rather than a spot check.
    expect(statusLabel("PENDING_CUSTOMER", "customer")).toBe("Waiting for your reply");
    expect(statusLabel("PENDING_CUSTOMER", "staff")).toBe("Waiting on customer");
  });

  it("tells the customer that THEY are the blocker", () => {
    // "Pending customer" describes the ticket from the desk's side; the
    // customer needs to know what to do.
    expect(statusLabel("PENDING_CUSTOMER", "customer")).toMatch(/your/i);
  });

  it("keeps every status labelled for both audiences", () => {
    const statuses = ["OPEN", "IN_PROGRESS", "PENDING_CUSTOMER", "RESOLVED", "CLOSED"] as const;
    for (const status of statuses) {
      for (const audience of ["customer", "staff"] as const) {
        expect(statusLabel(status, audience)).toBeTruthy();
        expect(statusLabel(status, audience)).not.toBe(status);
      }
    }
  });
});
