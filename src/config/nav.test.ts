import { describe, expect, it } from "vitest";

import { notificationsPath } from "@/lib/labels";
import type { Role } from "@/lib/types";

import { landingFor, navFor } from "./nav";

const ROLES: Role[] = ["CUSTOMER", "AGENT", "DISPATCHER", "ADMIN"];

/**
 * Navigation is UX, never security — the backend rejects a forbidden call with
 * 403/404 whatever the sidebar shows. What is worth pinning down is that every
 * role can *reach* the things built for them, which is the failure a hidden
 * link actually causes.
 */

describe("notifications", () => {
  it("is reachable by every role", () => {
    // Added at P21. A page nobody can navigate to is a page nobody uses, and
    // the bell footer alone would leave it one popover deep.
    for (const role of ROLES) {
      const hrefs = navFor(role).map((item) => item.href);
      expect(hrefs, role).toContain(notificationsPath(role === "CUSTOMER" ? "customer" : "staff"));
    }
  });

  it("sends customers to /updates and staff to /notifications", () => {
    // Two paths, not one: route groups do not affect the URL, so a single
    // `/notifications` page in both `(portal)` and `(staff)` would be two
    // pages resolving to the same route, which Next refuses. The split follows
    // the vocabulary anyway.
    expect(notificationsPath("customer")).toBe("/updates");
    expect(notificationsPath("staff")).toBe("/notifications");

    const hrefs = (role: Role) => navFor(role).map((item) => item.href);
    expect(hrefs("CUSTOMER")).toContain("/updates");
    expect(hrefs("CUSTOMER")).not.toContain("/notifications");
    for (const role of ["AGENT", "DISPATCHER", "ADMIN"] as Role[]) {
      expect(hrefs(role), role).toContain("/notifications");
    }
  });

  it("is called Updates for customers and Notifications for staff", () => {
    // The two-vocabulary rule labels.ts follows: customers get plain language,
    // staff get the operational term.
    const label = (role: Role) =>
      navFor(role).find((item) => item.icon === "bell")?.label;

    expect(label("CUSTOMER")).toBe("Updates");
    for (const role of ["AGENT", "DISPATCHER", "ADMIN"] as Role[]) {
      expect(label(role)).toBe("Notifications");
    }
  });
});

describe("every role", () => {
  it("has a landing route inside its own nav", () => {
    // Landing somewhere the sidebar does not list leaves a user with no
    // highlighted position and no obvious way back.
    for (const role of ROLES) {
      const hrefs = navFor(role).map((item) => item.href);
      expect(hrefs, role).toContain(landingFor(role));
    }
  });

  it("gets at least one item, and no duplicate destinations", () => {
    for (const role of ROLES) {
      const hrefs = navFor(role).map((item) => item.href);
      expect(hrefs.length, role).toBeGreaterThan(0);
      expect(new Set(hrefs).size, role).toBe(hrefs.length);
    }
  });
});

describe("customers", () => {
  it("are never offered a staff route", () => {
    // A convenience, not a boundary — but an offered link that 403s is a bug
    // in its own right.
    const hrefs = navFor("CUSTOMER").map((item) => item.href);
    for (const staffOnly of ["/tickets", "/queue", "/unassigned", "/dashboard", "/users"]) {
      expect(hrefs).not.toContain(staffOnly);
    }
  });
});
