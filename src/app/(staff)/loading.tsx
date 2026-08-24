import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-group loading UI (docs/UIUX_FRONTEND.md §8: "Skeleton rows/cards, never
 * a blank flash").
 *
 * Next streams this the moment a navigation starts, so a sidebar click paints
 * immediately instead of leaving the previous page frozen while the server
 * renders. The shape mirrors a staff list — a heading, then rows — so the swap
 * to real content does not jump the layout.
 */
export default function StaffLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-6 w-40" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <div className="overflow-hidden rounded-sm border border-border">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="border-t border-border px-4 py-3">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
