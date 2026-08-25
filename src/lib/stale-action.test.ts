import { describe, expect, it } from "vitest";

import { isStaleActionMessage as isStaleAction } from "./stale-action";

/**
 * The stale-action detector decides whether the boundary self-heals or shows a
 * message, so it is worth pinning down independently of React.
 *
 * This used to carry its own copy of the predicate, so it could keep passing
 * while `app/error.tsx` drifted. It now imports the shipped one — and it lives
 * here rather than under `src/app/`, which `next build` walks (see
 * `no-tests-in-app.test.ts`).
 */

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
