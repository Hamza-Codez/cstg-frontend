"use client";

/**
 * Select (docs/UIUX_FRONTEND.md §3.2).
 *
 * A custom listbox, not a native `<select>`.
 *
 * This was native by design until now, on the reasoning that a native control
 * is keyboard-accessible, screen-reader correct and renders as the platform
 * picker on mobile — all for free. What it will not do is look like this
 * product: the open list and its hover highlight are drawn by the OS, so the
 * options came out in browser-default sky blue against a slate palette.
 * `background-color` on `<option>` is honoured only by Chromium on Windows, and
 * the selected row highlight is unstylable essentially everywhere.
 *
 * So the ARIA contract is hand-written, and matches `Combobox` deliberately —
 * two hand-rolled widgets that behave differently is worse than one. The
 * difference is scope: Combobox filters a long list by typing; this is a short
 * fixed set, so it has no text input and closes on selection.
 *
 * Keyboard contract, tested in select.test.tsx:
 *   ArrowDown / ArrowUp   move through the options
 *   Home / End            first / last
 *   Enter / Space         select the active option
 *   Escape                close, keep the current value, focus the trigger
 *   letters               jump to the next option starting with them
 */

import { Check, ChevronDown } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { Field } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label: string;
  options: readonly SelectOption[];
  /** Shown as the empty choice. Selecting it clears the filter. */
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  hint?: string;
  error?: string;
  /** Renders the label for screen readers only — for dense filter bars. */
  hideLabel?: boolean;
  /** Omits the empty choice, for a picker where "none" is not a real answer. */
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export function Select({
  label,
  options,
  placeholder = "Any",
  value,
  defaultValue,
  onValueChange,
  hint,
  error,
  hideLabel = false,
  required = false,
  name,
  id,
  className,
  disabled = false,
}: SelectProps) {
  const generated = useId();
  const selectId = id ?? generated;
  const listId = `${selectId}-listbox`;

  // Uncontrolled when no `value` is given, so it drops into a plain form (the
  // Role picker) as easily as into URL-driven state (the filter bar).
  const [internal, setInternal] = useState(defaultValue ?? "");
  const current = value ?? internal;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ buffer: "", at: 0 });

  // The empty choice is a real row so the arrow keys reach it, rather than a
  // special case they have to skip.
  const rows: SelectOption[] = required
    ? [...options]
    : [{ value: "", label: placeholder }, ...options];

  const selectedIndex = Math.max(
    rows.findIndex((row) => row.value === current),
    0,
  );
  const selectedLabel = rows[selectedIndex]?.label ?? placeholder;

  function commit(next: string) {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function openList() {
    setActive(selectedIndex);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onAway(event: MouseEvent) {
      const target = event.target as Node;
      if (!listRef.current?.contains(target) && target !== triggerRef.current) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onAway);
    return () => document.removeEventListener("mousedown", onAway);
  }, [open]);

  // Keep the active option in view when arrowing past the visible window.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function onKeyDown(event: KeyboardEvent) {
    if (disabled) return;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((i) => Math.min(i + 1, rows.length - 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        return;
      case "Home":
        event.preventDefault();
        setActive(0);
        return;
      case "End":
        event.preventDefault();
        setActive(rows.length - 1);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        commit(rows[active]?.value ?? "");
        return;
      case "Escape":
        event.preventDefault();
        // Closes without changing the value. Escape means "never mind", and a
        // select that committed on Escape would be a trap.
        setOpen(false);
        triggerRef.current?.focus();
        return;
      case "Tab":
        setOpen(false);
        return;
    }

    // Typeahead. Successive letters within a second build a prefix, so "di"
    // reaches Dispatcher rather than cycling through the D entries.
    if (event.key.length === 1 && /\S/.test(event.key)) {
      const now = Date.now();
      const buffer =
        now - typeahead.current.at < 1000 ? typeahead.current.buffer + event.key : event.key;
      typeahead.current = { buffer, at: now };

      const needle = buffer.toLowerCase();
      const found = rows.findIndex((row) => row.label.toLowerCase().startsWith(needle));
      if (found >= 0) setActive(found);
    }
  }

  const control = (
    <div className={cn("relative", className)}>
      {/* The value still reaches a plain form submit, which is what lets this
          replace a native select without every call site becoming controlled. */}
      {name && <input type="hidden" name={name} value={current} />}

      <button
        ref={triggerRef}
        type="button"
        id={selectId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={hideLabel ? label : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border bg-surface px-3 py-2 text-left text-sm text-text",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-overdue" : "border-structure",
        )}
      >
        <span className={cn("truncate", current === "" && "text-text-muted")}>{selectedLabel}</span>
        <ChevronDown
          aria-hidden
          strokeWidth={1.5}
          className={cn(
            "size-4 shrink-0 text-text-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${selectId}-option-${active}`}
          tabIndex={-1}
          className="custom-scrollbar absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg"
        >
          {rows.map((row, index) => {
            const isSelected = row.value === current;
            const isActive = index === active;
            return (
              <li
                key={row.value || "__empty"}
                id={`${selectId}-option-${index}`}
                data-index={index}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(index)}
                onClick={() => commit(row.value)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm",
                  // Palette, not the OS. This is the whole reason the native
                  // control was replaced.
                  isActive ? "bg-structure text-text-inverse" : "text-text",
                  !isActive && isSelected && "bg-canvas",
                  row.value === "" && !isActive && "text-text-muted",
                )}
              >
                <span className="truncate">{row.label}</span>
                {/* A tick as well as the fill, so the current value survives
                    greyscale and never rests on colour alone. */}
                {isSelected && <Check aria-hidden strokeWidth={2} className="size-4 shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  if (hideLabel) return control;

  return (
    <Field label={label} htmlFor={selectId} hint={hint} error={error}>
      {control}
    </Field>
  );
}
