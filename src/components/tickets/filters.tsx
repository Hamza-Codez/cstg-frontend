"use client";

/**
 * Filter bar (docs/UIUX_FRONTEND.md §7.3.4, spec04 frontend §3).
 *
 * A thin client shell over URL state. It holds no list data and fetches
 * nothing — it only rewrites the query string, and the Server Component page
 * re-renders with the new results. That is what keeps the list server-fetched
 * and the token server-side.
 */

import { ListFilter, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { Select } from "@/components/ui/select";
import {
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  TIERS,
  applyFilterChange,
  canUseStaffWideFilters,
  parseFilters,
} from "@/lib/filters";
import { categoryLabel, priorityLabel, statusLabel, tierLabel } from "@/lib/labels";
import type { Role } from "@/lib/types";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * A filter control with its label welded on top.
 *
 * The label is a filled cap in the dark chrome gradient with white text
 * (11.8:1), sharing an edge with the control: square where they meet, rounded
 * on the outside. Reads as one object rather than a caption floating above a
 * box.
 */
function FilterControl({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="rounded-t-sm bg-gradient-header px-2 py-1 text-xs font-medium text-text-inverse">
        {label}
      </span>
      {children}
    </div>
  );
}

/** Controls sit flush under their cap: square top, rounded bottom. */
const WELDED = "rounded-t-none rounded-b-sm";

export function FilterBar({
  role,
  resultCount,
  savedViews,
}: {
  role: Role;
  resultCount: number;
  /**
   * Rendered inside the action bar. Passed in rather than imported so this
   * component stays free of data fetching — the slot arrives already resolved
   * from the Server Component.
   */
  savedViews?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filters = parseFilters(Object.fromEntries(searchParams.entries()));
  const staffWide = canUseStaffWideFilters(role);

  /**
   * Every change routes through here, so `applyFilterChange` — and with it the
   * cursor drop — cannot be bypassed by a control that forgets.
   */
  function change(patch: Record<string, string | undefined>) {
    const next = applyFilterChange(searchParams, patch);
    router.replace(`${pathname}${next.size > 0 ? `?${next}` : ""}`, { scroll: false });
  }

  function clearAll() {
    router.replace(pathname, { scroll: false });
  }

  const chips = activeChips(filters);

  const controls = (
    <div className="flex flex-wrap items-end gap-3">
      <FilterControl label="Search">
        <SearchField initial={filters.q ?? ""} onSearch={(q) => change({ q })} />
      </FilterControl>

      <FilterControl label="Status">
        <Select
          label="Status"
          hideLabel
          className={WELDED}
          value={filters.status ?? ""}
          onValueChange={(next) => change({ status: next })}
          options={STATUSES.map((s) => ({ value: s, label: statusLabel(s, "staff") }))}
        />
      </FilterControl>

      <FilterControl label="Priority">
        <Select
          label="Priority"
          hideLabel
          className={WELDED}
          value={filters.priority ?? ""}
          onValueChange={(next) => change({ priority: next })}
          options={PRIORITIES.map((p) => ({ value: p, label: priorityLabel(p) }))}
        />
      </FilterControl>

      <FilterControl label="Category">
        <Select
          label="Category"
          hideLabel
          className={WELDED}
          value={filters.category ?? ""}
          onValueChange={(next) => change({ category: next })}
          options={CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c) }))}
        />
      </FilterControl>

      {/* Role-gated controls are ABSENT, not disabled (§1.2). An agent has no
          plan filter because every ticket they can see is already theirs;
          rendering it disabled would imply a capability that does not exist.
          The backend refuses these with 403 regardless — this is UX only. */}
      {staffWide && (
        <FilterControl label="Plan">
          <Select
            label="Plan"
            hideLabel
            className={WELDED}
            value={filters.tier ?? ""}
            onValueChange={(next) => change({ tier: next })}
            options={TIERS.map((t) => ({ value: t, label: tierLabel(t) }))}
          />
        </FilterControl>
      )}
    </div>
  );

  /**
   * Saved views, the boolean toggles, and the active-filter chips, together in
   * one persistent bar.
   *
   * Persistent is the point: the chips row used to appear and disappear, which
   * reflowed everything below it every time a filter was toggled. A bar that is
   * always present with a stable minimum height keeps the page still.
   */
  const actionBar = (
    <div className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-2 rounded-sm bg-gradient-header px-3 py-2">
      {savedViews}

      <div className="flex items-center gap-4">
        <ToggleFilter
          label="Overdue only"
          checked={filters.breached === true}
          onChange={(on) => change({ breached: on ? "true" : undefined })}
        />
        <ToggleFilter
          label="Escalated only"
          checked={filters.escalated === true}
          onChange={(on) => change({ escalated: on ? "true" : undefined })}
        />
      </div>

      {chips.length > 0 && (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => change({ [chip.key]: undefined })}
              aria-label={`Remove filter: ${chip.label}`}
              className="flex cursor-pointer items-center gap-1 rounded-full bg-surface px-3 py-1 text-xs text-text hover:bg-canvas"
            >
              {chip.label}
              <X aria-hidden strokeWidth={1.5} className="size-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="cursor-pointer text-xs text-text-inverse underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Desktop */}
      <div className="hidden md:flex w-full items-end justify-between gap-3">
        {controls}
        <div id="bulk-action-portal-desktop" className="empty:hidden" />
      </div>

      {/* Mobile: the selectors collapse behind a trigger showing the active
          count, so a user who scrolled past them still knows the list is
          filtered. The action bar stays visible at every width — it is where
          the toggles and chips live. */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex cursor-pointer items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text"
        >
          <ListFilter aria-hidden strokeWidth={1.5} className="size-4 text-structure" />
          Filters
          {chips.length > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-on-accent">
              {chips.length}
            </span>
          )}
        </button>
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filters">
          <div className="flex flex-col gap-3">{controls}</div>
        </Drawer>
      </div>

      {actionBar}

      {/* A silent list change is invisible to a screen-reader user. */}
      <p aria-live="polite" className="sr-only">
        {resultCount === 1 ? "1 ticket matches" : `${resultCount} tickets match`} your filters.
      </p>
    </div>
  );
}

/** Debounced text input that still submits immediately on Enter. */
function SearchField({
  initial,
  onSearch,
}: {
  initial: string;
  onSearch: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep in step when the URL changes underneath us — a saved view or a chip
  // removal must not leave a stale term in the box.
  useEffect(() => setValue(initial), [initial]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  function schedule(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(next), SEARCH_DEBOUNCE_MS);
  }

  function submitNow() {
    if (timer.current) clearTimeout(timer.current);
    onSearch(value);
  }

  // No label of its own: FilterControl supplies the cap, and a second caption
  // here made the Search column a row taller than the other four.
  return (
    <input
      type="search"
      value={value}
      aria-label="Search"
      placeholder="Subject or description"
      onChange={(event) => schedule(event.target.value)}
      onKeyDown={(event) => {
        // Debounce must never swallow an explicit submit.
        if (event.key === "Enter") {
          event.preventDefault();
          submitNow();
        }
      }}
      className={`${WELDED} border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent`}
    />
  );
}

function ToggleFilter({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-text-inverse">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="cursor-pointer accent-accent"
      />
      {label}
    </label>
  );
}

interface Chip {
  key: string;
  label: string;
}

/**
 * Active filters, rendered as removable chips. Without them a user who scrolled
 * past the bar sees an inexplicably short list — the classic filter trap.
 */
function activeChips(filters: ReturnType<typeof parseFilters>): Chip[] {
  const chips: Chip[] = [];
  if (filters.q) chips.push({ key: "q", label: `Search: ${filters.q}` });
  if (filters.status)
    chips.push({ key: "status", label: `Status: ${statusLabel(filters.status, "staff")}` });
  if (filters.priority)
    chips.push({ key: "priority", label: `Priority: ${priorityLabel(filters.priority)}` });
  if (filters.category)
    chips.push({ key: "category", label: `Category: ${categoryLabel(filters.category)}` });
  if (filters.tier) chips.push({ key: "tier", label: `Plan: ${tierLabel(filters.tier)}` });
  if (filters.breached === true) chips.push({ key: "breached", label: "Overdue only" });
  if (filters.escalated === true) chips.push({ key: "escalated", label: "Escalated only" });
  if (filters.assigned === false) chips.push({ key: "assigned", label: "Unassigned only" });
  return chips;
}
