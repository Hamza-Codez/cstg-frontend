/**
 * Top bar (docs/UIUX_FRONTEND.md §5): product name, and the user menu.
 * Server Component — nothing here is interactive except the sign-out form,
 * which posts to the /sign-out route handler.
 */

import { LogOut, LifeBuoy } from "lucide-react";

import { GlobalSearch } from "@/components/layout/global-search";
import { ACTIONS } from "@/lib/labels";

export function TopBar({ subtitle, search }: { subtitle?: string; search?: boolean }) {
  return (
    <header className="flex items-center justify-between gap-4 bg-gradient-header px-4 py-3 text-text-inverse">
      <div className="flex items-center gap-2">
        <LifeBuoy aria-hidden className="size-5 text-accent" strokeWidth={2.5} />
        <div className="flex items-baseline gap-3">
          <span className="text-base font-semibold">Support Engine</span>
          {subtitle && <span className="text-xs text-text-inverse/80">{subtitle}</span>}
        </div>
      </div>
      {search && (
        <div className="hidden sm:block">
          <GlobalSearch action="/tickets" placeholder="Search tickets" />
        </div>
      )}
      {/* Posts to the /sign-out route rather than a Server Action.
          Action ids are regenerated on every build, so a tab opened before a
          deploy submits an id the server no longer knows and gets
          "Server Action was not found". A route URL is stable across builds. */}
      <form action="/sign-out" method="post">
        <button
          type="submit"
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors duration-fast hover:bg-text-inverse/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <LogOut aria-hidden className="size-4" strokeWidth={1.5} />
          {ACTIONS.signOut}
        </button>
      </form>
    </header>
  );
}
