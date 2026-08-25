/**
 * Customer shell (docs/UIUX_FRONTEND.md §6). Mobile-first: the sidebar collapses
 * to a horizontal strip on small screens.
 *
 * The redirect here is UX, not security — every API call is authorised again on
 * the backend (AUTHORIZATION.md §4).
 */

import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { landingFor, navFor } from "@/config/nav";
import { getSession } from "@/lib/auth/session";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.principalType !== "CUSTOMER") redirect(landingFor(session.role));

  return <AppShell nav={navFor(session.role)} audience="customer">{children}</AppShell>;
}
