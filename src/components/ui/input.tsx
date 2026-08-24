/**
 * Text input and field wrapper (docs/UIUX_FRONTEND.md §3.2).
 *
 * Labels sit above the field in sentence case; errors sit beneath in the overdue
 * colour and say what to fix. "Required" is spelled out rather than signalled by
 * colour alone, so the requirement survives for colour-blind users.
 */

import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";

import { cn } from "@/lib/cn";

export interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, required, error, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-structure">
        {label}
        {required && <span className="font-normal text-text/60"> (required)</span>}
      </label>
      {hint && <p className="text-xs text-text/60">{hint}</p>}
      {children}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-overdue">
          {error}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, required, className, ...props }: InputProps) {
  const generated = useId();
  const inputId = id ?? generated;

  return (
    <Field label={label} htmlFor={inputId} required={required} error={error} hint={hint}>
      <input
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(
          "rounded-md border bg-surface px-3 py-2 text-sm text-text",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
          error ? "border-overdue" : "border-structure",
          className,
        )}
        {...props}
      />
    </Field>
  );
}
