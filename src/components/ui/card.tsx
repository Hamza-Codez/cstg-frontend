/**
 * Card (docs/UIUX_FRONTEND.md §2.1).
 *
 * The structural blue lives in the header strip, not the body: long ticket text
 * on blue is hard to read, so bodies stay white while the 30% blue presence
 * comes from chrome.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-sm border border-border bg-surface", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-structure px-4 py-3 text-text-inverse">
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  // 600 is permitted for a card header only (§2.4).
  return <h2 className="text-base font-semibold">{children}</h2>;
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-4 py-4", className)}>{children}</div>;
}
