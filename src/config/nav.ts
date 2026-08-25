/**
 * Per-role navigation and landing routes (docs/UIUX_FRONTEND.md §6).
 *
 * Pure data — icons are named, not imported. Server Components hand this array
 * to the client Sidebar, and a component reference cannot cross that boundary;
 * the Sidebar resolves the name to a lucide icon on its side.
 *
 * UX only. Hiding a link is a convenience, never a security boundary — the
 * backend rejects a forbidden call with 403/404 regardless (AUTHORIZATION.md §4).
 */

import type { Role } from "@/lib/types";

export type IconName =
  | "plus"
  | "ticket"
  | "inbox"
  | "alert"
  | "dashboard"
  | "users"
  | "settings"
  | "archive"
  | "bell";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const NAV: Record<Role, NavItem[]> = {
  CUSTOMER: [
    { href: "/requests/new", label: "New request", icon: "plus" },
    { href: "/requests", label: "My requests", icon: "ticket" },
    // "Updates", not "Notifications" — the customer vocabulary, the same
    // two-audience rule labels.ts follows.
    { href: "/updates", label: "Updates", icon: "bell" },
  ],
  AGENT: [
    { href: "/queue", label: "My queue", icon: "inbox" },
    { href: "/tickets", label: "Tickets", icon: "ticket" },
    { href: "/notifications", label: "Notifications", icon: "bell" },
  ],
  DISPATCHER: [
    { href: "/unassigned", label: "Unassigned", icon: "inbox" },
    { href: "/tickets", label: "All tickets", icon: "ticket" },
    { href: "/overdue", label: "Overdue", icon: "alert" },
    { href: "/notifications", label: "Notifications", icon: "bell" },
  ],
  ADMIN: [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/tickets", label: "All tickets", icon: "ticket" },
    { href: "/overdue", label: "Overdue", icon: "archive" },
    { href: "/users", label: "Users", icon: "users" },
    { href: "/notifications", label: "Notifications", icon: "bell" },
    { href: "/configuration", label: "Configuration", icon: "settings" },
  ],
};

/** Where each role lands after signing in (§6). */
const LANDING: Record<Role, string> = {
  CUSTOMER: "/requests",
  AGENT: "/queue",
  DISPATCHER: "/unassigned",
  ADMIN: "/dashboard",
};

export function navFor(role: Role): NavItem[] {
  return NAV[role];
}

export function landingFor(role: Role): string {
  return LANDING[role];
}
