/**
 * Text input and field wrapper (docs/UIUX_FRONTEND.md §3.2).
 *
 * Labels sit above the field in sentence case; errors sit beneath in the overdue
 * colour and say what to fix. "Required" is spelled out rather than signalled by
 * colour alone, so the requirement survives for colour-blind users.
 */

import { Eye, EyeOff } from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { useId, useState } from "react";

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

  // A password field gets a reveal toggle. `type` is driven by state rather
  // than the prop, so the toggle survives re-renders and the caller still just
  // writes `type="password"`.
  const isPassword = props.type === "password";
  const [revealed, setRevealed] = useState(false);

  const control = (
    <input
      id={inputId}
      required={required}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${inputId}-error` : undefined}
      className={cn(
        "w-full rounded-md border bg-surface px-3 py-2 text-sm text-text",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
        error ? "border-overdue" : "border-structure",
        // Room for the toggle, so a long password does not run under it.
        isPassword && "pr-10",
        className,
      )}
      {...props}
      type={isPassword && revealed ? "text" : props.type}
    />
  );

  return (
    <Field label={label} htmlFor={inputId} required={required} error={error} hint={hint}>
      {isPassword ? (
        <div className="relative">
          {control}
          <button
            type="button"
            onClick={() => setRevealed((shown) => !shown)}
            // The name says what pressing it DOES, and `aria-pressed` carries
            // the current state — a static "Toggle password" would leave a
            // screen-reader user unable to tell whether it is showing or not.
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            aria-controls={inputId}
            // Never a tab stop before the field it belongs to; -1 would put it
            // out of keyboard reach entirely, so it stays in the natural order.
            className="absolute inset-y-0 right-0 flex cursor-pointer items-center rounded-r-md px-3 text-text-muted transition-colors hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          >
            {revealed ? (
              <EyeOff aria-hidden strokeWidth={1.5} className="size-4" />
            ) : (
              <Eye aria-hidden strokeWidth={1.5} className="size-4" />
            )}
          </button>
        </div>
      ) : (
        control
      )}
    </Field>
  );
}
