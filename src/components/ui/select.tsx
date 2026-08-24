/**
 * Select (docs/UIUX_FRONTEND.md §3.2).
 *
 * A styled native <select>, deliberately not a custom listbox. The native
 * control is keyboard-accessible, screen-reader correct, and renders as the
 * platform picker on mobile — all for free. The one place v2 builds a custom
 * widget is the agent combobox in P18, where searching a staff list genuinely
 * needs it.
 */

import type { SelectHTMLAttributes } from "react";
import { useId } from "react";

import { Field } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string;
  options: readonly SelectOption[];
  /** Shown as the empty choice. Selecting it clears the filter. */
  placeholder?: string;
  hint?: string;
  error?: string;
  /** Renders the label for screen readers only — for dense filter bars. */
  hideLabel?: boolean;
}

export function Select({
  label,
  options,
  placeholder = "Any",
  hint,
  error,
  hideLabel = false,
  id,
  className,
  ...props
}: SelectProps) {
  const generated = useId();
  const selectId = id ?? generated;

  const control = (
    <select
      id={selectId}
      aria-label={hideLabel ? label : undefined}
      aria-invalid={error ? true : undefined}
      className={cn(
        "cursor-pointer rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
        className,
      )}
      {...props}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  if (hideLabel) return control;

  return (
    <Field label={label} htmlFor={selectId} hint={hint} error={error}>
      {control}
    </Field>
  );
}
