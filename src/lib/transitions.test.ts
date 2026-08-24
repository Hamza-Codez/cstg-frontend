import { describe, expect, it } from "vitest";

import { availableTransitions } from "./transitions";

const assigned = { hasAssignee: true, isAssignedToMe: true };

describe("availableTransitions", () => {
  it("offers Start working to the assigned agent on an OPEN ticket", () => {
    expect(availableTransitions("OPEN", "AGENT", assigned).map((t) => t.label)).toEqual([
      "Start working",
    ]);
  });

  it("hides Start working while the ticket is unassigned (T1 guard)", () => {
    expect(
      availableTransitions("OPEN", "ADMIN", { hasAssignee: false, isAssignedToMe: false }),
    ).toEqual([]);
  });

  it("offers an agent nothing on a ticket assigned to someone else", () => {
    expect(
      availableTransitions("IN_PROGRESS", "AGENT", { hasAssignee: true, isAssignedToMe: false }),
    ).toEqual([]);
  });

  it("gives a dispatcher Close only — never Start or Resolve (§3 matrix)", () => {
    expect(availableTransitions("OPEN", "DISPATCHER", assigned)).toEqual([]);
    expect(availableTransitions("IN_PROGRESS", "DISPATCHER", assigned)).toEqual([]);
    expect(availableTransitions("RESOLVED", "DISPATCHER", assigned).map((t) => t.to)).toEqual([
      "CLOSED",
    ]);
  });

  it("offers nothing on a CLOSED ticket — the lifecycle is strictly forward", () => {
    for (const role of ["AGENT", "DISPATCHER", "ADMIN"] as const) {
      expect(availableTransitions("CLOSED", role, assigned)).toEqual([]);
    }
  });

  it("never offers a customer anything", () => {
    for (const status of ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const) {
      expect(availableTransitions(status, "CUSTOMER", assigned)).toEqual([]);
    }
  });
});
