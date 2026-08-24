/**
 * Data table for staff lists (docs/UIUX_FRONTEND.md §5).
 *
 * Blue header row, white body, rounded-md container, cursor-pointer rows.
 * Wrapped in an overflow container so a wide table scrolls itself rather than
 * the page.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Table({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-structure text-text-inverse">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return <th scope="col" className="px-4 py-[7px] text-[13px] font-medium">{children}</th>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="bg-surface">{children}</tbody>;
}

export function Tr({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-t border-border transition-colors hover:bg-canvas",
        onClick && "cursor-pointer",
      )}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-[7px] text-text", className)}>{children}</td>;
}
