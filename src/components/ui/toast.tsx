"use client";

/**
 * Toast (docs/UIUX_FRONTEND.md §5): bottom, rounded-md, icon + one line,
 * auto-dismiss. The message matches the action verb ("Resolved", "Reply sent"),
 * which is why callers pass a finished phrase rather than a sentence.
 */

import { CircleCheck, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/cn";

export type ToastTone = "success" | "error";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, tone: ToastTone = "success") => {
    setToasts((current) => [...current, { id: Date.now() + Math.random(), message, tone }]);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDone={() => setToasts((c) => c.filter((t) => t.id !== toast.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  const Icon = toast.tone === "success" ? CircleCheck : TriangleAlert;

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-2 rounded-md border bg-surface px-4 py-2 text-sm shadow-md",
        toast.tone === "success" ? "border-border text-text" : "border-overdue text-overdue",
      )}
    >
      <Icon aria-hidden className="size-4" strokeWidth={1.5} />
      {toast.message}
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
