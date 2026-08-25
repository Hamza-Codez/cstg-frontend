/**
 * App shell (docs/UIUX_FRONTEND.md §5): blue top bar and sidebar, content on the
 * cream canvas inside white cards, centred at the content max-width (§2.5).
 */

import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import type { NavItem } from "@/config/nav";
import type { Audience } from "@/lib/types";

export function AppShell({
  nav,
  subtitle,
  search = false,
  audience = "staff",
  children,
}: {
  nav: NavItem[];
  subtitle?: string;
  audience?: Audience;
  /** Staff get the global ticket search; the portal has its own, scoped one. */
  search?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar subtitle={subtitle} search={search} audience={audience} />
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <Sidebar items={nav} />
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <main className="mx-auto w-full max-w-content px-4 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
