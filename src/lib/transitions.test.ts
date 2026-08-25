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

  it("gives a dispatcher Close and Reopen — never Start, Resolve or Pause (§3 matrix)", () => {
    expect(availableTransitions("OPEN", "DISPATCHER", assigned)).toEqual([]);
    // T4 pause is the assigned agent's call, so IN_PROGRESS still offers a
    // dispatcher nothing.
    expect(availableTransitions("IN_PROGRESS", "DISPATCHER", assigned)).toEqual([]);
    expect(availableTransitions("RESOLVED", "DISPATCHER", assigned).map((t) => t.to)).toEqual([
      "CLOSED",
      "IN_PROGRESS",
    ]);
  });

  it("offers an assigned agent both Resolve and Wait, with Resolve primary", () => {
    // The lifecycle stopped being linear at P16, so the panel can no longer
    // assume one option — but only one may be primary (§3.1).
    const options = availableTransitions("IN_PROGRESS", "AGENT", assigned);
    expect(options.map((t) => t.to)).toEqual(["RESOLVED", "PENDING_CUSTOMER"]);
    expect(options.filter((t) => t.primary).map((t) => t.to)).toEqual(["RESOLVED"]);
  });

  it("offers staff a resume from PENDING_CUSTOMER", () => {
    const options = availableTransitions("PENDING_CUSTOMER", "AGENT", assigned);
    expect(options.map((t) => t.to)).toEqual(["IN_PROGRESS"]);
    expect(options[0].primary).toBe(true);
  });

  it("does not offer a dispatcher the resume", () => {
    expect(availableTransitions("PENDING_CUSTOMER", "DISPATCHER", assigned)).toEqual([]);
  });

  it("offers Reopen on any resolved ticket rather than recomputing the window", () => {
    // The window is a backend rule and TicketResponse carries no "reopenable"
    // flag; a 422 explains it instead (spec05 frontend §4).
    expect(availableTransitions("RESOLVED", "AGENT", assigned).map((t) => t.to)).toContain(
      "IN_PROGRESS",
    );
  });

  it("offers nothing at all on a closed ticket", () => {
    expect(availableTransitions("CLOSED", "ADMIN", assigned)).toEqual([]);
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
