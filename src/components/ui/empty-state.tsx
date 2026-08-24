/**
 * Empty state (docs/UIUX_FRONTEND.md §5): an icon, one plain line of direction,
 * and the primary CTA — never a dead end.
 */

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <Icon aria-hidden className="size-8 text-structure" strokeWidth={1.5} />
      <p className="text-sm text-text">{message}</p>
      {action}
    </div>
  );
}
