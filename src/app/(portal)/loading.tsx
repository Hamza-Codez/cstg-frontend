import { Skeleton } from "@/components/ui/skeleton";

/** Portal loading UI (docs/UIUX_FRONTEND.md §8) — request cards, mobile-first. */
export default function PortalLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-sm border border-border bg-surface">
          <Skeleton className="h-10 w-full" />
          <div className="flex items-center justify-between gap-4 px-4 py-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}
