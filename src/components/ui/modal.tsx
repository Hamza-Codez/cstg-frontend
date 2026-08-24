"use client";

/**
 * Modal (docs/UIUX_FRONTEND.md §5): used sparingly, focus-trapped, Esc closes,
 * a single soft shadow. Built on <dialog> so the browser supplies the focus trap
 * and the top layer rather than us reimplementing them.
 */

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
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
      className="w-[min(32rem,calc(100vw-2rem))] rounded-md border border-border bg-surface p-0 text-text shadow-lg backdrop:bg-text/40"
    >
      <div className="flex items-center justify-between gap-4 bg-structure px-4 py-3 text-text-inverse">
        <h2 className="text-base font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="cursor-pointer rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <X aria-hidden className="size-4" strokeWidth={1.5} />
        </button>
      </div>
      <div className="px-4 py-4">{children}</div>
    </dialog>
  );
}
