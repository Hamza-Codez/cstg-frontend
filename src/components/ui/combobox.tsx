"use client";

/**
 * Combobox (spec07 frontend §3).
 *
 * The one custom widget v2 adds. Every other control uses a native element
 * precisely so this is the only place carrying a hand-written ARIA contract —
 * searching a staff list is the case a native `<select>` genuinely cannot serve.
 *
 * Keyboard contract, tested in combobox.test.tsx:
 *   ↓ / ↑   move `aria-activedescendant` through the listbox
 *   Enter   selects the active option
 *   Esc     closes and returns focus to the input
 *   typing  filters
 * The option count is announced through a live region.
 */

import { Check, ChevronDown } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Rendered beside the label — used for agent workload. */
  hint?: string;
  /** Selectable, but marked. At-capacity agents stay pickable by design. */
  flagged?: boolean;
  flagLabel?: string;
}

export function Combobox({
  label,
  options,
  value,
  onChange,
  placeholder = "Search…",
  emptyMessage = "No matches.",
}: {
  label: string;
  options: readonly ComboboxOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
}) {
  const listId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => o.label.toLowerCase().includes(needle));
  }, [options, query]);

  const selected = options.find((o) => o.value === value) ?? null;

  function commit(option: ComboboxOption) {
    onChange(option.value);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => {
        if (filtered.length === 0) return 0;
        return (current + delta + filtered.length) % filtered.length;
      });
      return;
    }
    if (event.key === "Enter" && open) {
      event.preventDefault();
      const option = filtered[active];
      if (option) commit(option);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      // Focus returns to the input rather than escaping the widget entirely.
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-[13px] text-text">
        {label}
      </label>

      <div className="relative">
        <div className="flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-accent">
          <input
            id={inputId}
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && filtered[active] ? `${listId}-${active}` : undefined}
            value={open ? query : (selected?.label ?? "")}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
            className="w-full bg-transparent text-sm text-text focus-visible:outline-none"
          />
          <ChevronDown aria-hidden strokeWidth={1.5} className="size-4 shrink-0 text-structure" />
        </div>

        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-sm border border-border bg-surface shadow-lg"
          >
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-text/60">{emptyMessage}</li>
            )}
            {filtered.map((option, index) => (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={option.value === value}
                onMouseDown={(event) => {
                  // mousedown, not click: blur would close the list first.
                  event.preventDefault();
                  commit(option);
                }}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-text",
                  index === active && "bg-canvas",
                )}
              >
                {option.value === value ? (
                  <Check aria-hidden strokeWidth={1.5} className="size-4 text-on-track" />
                ) : (
                  <span aria-hidden className="size-4" />
                )}
                <span className="flex-1">{option.label}</span>
                {option.hint && <span className="text-xs text-text/60">{option.hint}</span>}
                {option.flagged && option.flagLabel && (
                  <span className="text-xs text-at-risk">{option.flagLabel}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* A silent list change is invisible to a screen-reader user. */}
      <span aria-live="polite" className="sr-only">
        {open ? `${filtered.length} ${filtered.length === 1 ? "option" : "options"}` : ""}
      </span>
    </div>
  );
}
