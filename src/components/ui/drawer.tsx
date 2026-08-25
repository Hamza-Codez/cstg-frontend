"use client";

/**
 * Drawer (docs/UIUX_FRONTEND.md §9): the mobile surface for the filter bar.
 *
 * Built on <dialog> for the same reason as Modal — the browser supplies the
 * focus trap, the top layer, and Esc-to-close rather than us reimplementing
 * three things that are easy to get subtly wrong.
 *
 * Distinct from Modal only in presentation: it slides from the edge and fills
 * the height, because a filter panel is a workspace rather than a decision.
 */

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onCancel={onClose}
      className="m-0 ml-auto h-full max-h-none w-[min(22rem,calc(100vw-3rem))] border-l border-border bg-surface p-0 text-text shadow-lg backdrop:bg-text/40"
    >
      <div className="flex items-center justify-between gap-4 bg-structure px-4 py-3 text-text-inverse">
        <h2 className="text-base font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="cursor-pointer rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <X aria-hidden strokeWidth={1.5} className="size-5" />
        </button>
      </div>
      <div className="overflow-y-auto p-4">{children}</div>
    </dialog>
  );
}
