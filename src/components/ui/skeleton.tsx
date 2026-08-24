/** Loading placeholder. Radius stays within the cap (docs/UIUX_FRONTEND.md §2.3). */

import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-sm bg-canvas", className)} />;
}
