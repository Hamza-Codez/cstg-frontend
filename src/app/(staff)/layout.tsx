/**
 * Staff shell (docs/UIUX_FRONTEND.md §6): sidebar + top-bar workspace shared by
 * AGENT, DISPATCHER, and ADMIN, each seeing only its own navigation.
 */

import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { landingFor, navFor } from "@/config/nav";
import { getSession } from "@/lib/auth/session";
import { roleLabel } from "@/lib/labels";

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.principalType !== "USER") redirect(landingFor(session.role));

  return (
    <AppShell nav={navFor(session.role)} subtitle={roleLabel(session.role)} search>
      {children}
    </AppShell>
  );
}
