"use client";

/**
 * Sidebar (docs/UIUX_FRONTEND.md §5). Client only because the active item is
 * derived from the current pathname — that active marker is an accent indicator,
 * the one place accent appears in navigation.
 */

import { Archive, Bell, Inbox, LayoutDashboard, Plus, Settings, Ticket, TriangleAlert, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { IconName, NavItem } from "@/config/nav";
import { cn } from "@/lib/cn";

/** Icon names arrive as data from the server; resolve them here (§6). */
const ICONS: Record<IconName, LucideIcon> = {
  plus: Plus,
  ticket: Ticket,
  inbox: Inbox,
  alert: TriangleAlert,
  dashboard: LayoutDashboard,
  users: Users,
  settings: Settings,
  archive: Archive,
  bell: Bell,
};

export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="bg-gradient-sidebar md:min-h-full md:w-56">
      <ul className="flex flex-col overflow-x-auto py-2 md:overflow-visible">
        {items.map(({ href, label, icon }) => {
          const Icon = ICONS[icon];
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 whitespace-nowrap px-6 py-2.5 text-sm",
                  "text-text-inverse transition-colors duration-fast relative",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent focus-visible:-outline-offset-2",
                  active ? "bg-[rgba(255,255,255,0.2)] backdrop-blur-md font-medium" : "hover:bg-text-inverse/5 text-text-inverse/80 hover:text-text-inverse",
                )}
              >
                {/* Accent bar marks the active item (§2.1: accent = affordance). */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-md bg-accent"
                  />
                )}
                <Icon aria-hidden className="size-5" strokeWidth={1.5} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
