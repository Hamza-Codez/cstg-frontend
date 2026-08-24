import { describe, expect, it } from "vitest";

/**
 * The stale-action detector decides whether the boundary self-heals or shows a
 * message, so it is worth pinning down independently of React.
 */
function isStaleAction(message: string): boolean {
  return /server action/i.test(message) && /not\s*(be\s*)?found/i.test(message);
}

describe("stale Server Action detection", () => {
  it("recognises the error Next actually throws", () => {
    expect(
      isStaleAction('Server Action "609327315359a062354947f4b6581468dcd5ee7a17" was not found on the server.'),
    ).toBe(true);
  });

  it("recognises the wording variant", () => {
    expect(isStaleAction("Failed to find Server Action. It could not be found.")).toBe(true);
  });

  it("does not swallow unrelated failures", () => {
    for (const message of [
      "Ticket not found",
      "Could not reach the server.",
      "TypeError: undefined is not a function",
      "NEXT_NOT_FOUND",
    ]) {
      expect(isStaleAction(message)).toBe(false);
    }
  });
});
