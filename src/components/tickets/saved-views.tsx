"use client";

/**
 * Saved view chips (spec04 frontend §6).
 *
 * A saved view is a stored query string. Selecting one replaces the current
 * filters wholesale rather than merging — merging would produce a list that
 * matches neither the view nor what the user had, with no way to tell which.
 */

import { Bookmark, TriangleAlert, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { createSavedViewAction, type SavedViewState } from "@/app/actions/saved-views";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { SavedView } from "@/lib/api/saved-views";
import {
  STAFF_WIDE_FILTERS,
  canUseStaffWideFilters,
  hasActiveFilters,
  parseFilters,
  toSearchParams,
} from "@/lib/filters";
import type { Role } from "@/lib/types";

export function SavedViews({
  views,
  role,
  onDelete,
}: {
  views: SavedView[];
  role: Role;
  onDelete: (formData: FormData) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [naming, setNaming] = useState(false);
  const [state, formAction, pending] = useActionState<SavedViewState, FormData>(
    createSavedViewAction,
    {},
  );
  const { show } = useToast();

  useEffect(() => {
    if (state.ok) {
      setNaming(false);
      show("View saved");
    }
  }, [state.ok, show]);

  const filters = parseFilters(Object.fromEntries(searchParams.entries()));
  const canSave = hasActiveFilters(filters);
  const staffWide = canUseStaffWideFilters(role);

  function apply(view: SavedView) {
    const params = toSearchParams(view.filters);
    router.replace(`${pathname}${params.size > 0 ? `?${params}` : ""}`, { scroll: false });
  }

  /**
   * A view saved as a dispatcher keeps working until its owner becomes an
   * agent. Roles change, and the backend then refuses the stored filter with
   * 403 — so the chip warns and offers removal instead of failing silently on
   * click (spec04 frontend §6).
   */
  function isStale(view: SavedView): boolean {
    if (staffWide) return false;
    return STAFF_WIDE_FILTERS.some((key) => view.filters[key] !== undefined);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {views.map((view) => {
        const stale = isStale(view);
        return (
          <span
            key={view.id}
            className="flex items-center gap-1 rounded-full bg-surface pl-3 pr-1 text-xs text-text"
          >
            <button
              type="button"
              onClick={() => !stale && apply(view)}
              disabled={stale}
              title={
                stale ? "This view uses a filter your role can no longer use." : undefined
              }
              className="flex cursor-pointer items-center gap-1 py-1 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {stale ? (
                <TriangleAlert aria-hidden strokeWidth={1.5} className="size-3 text-at-risk" />
              ) : (
                <Bookmark aria-hidden strokeWidth={1.5} className="size-3 text-structure" />
              )}
              {view.name}
            </button>
            <form action={onDelete}>
              <input type="hidden" name="id" value={view.id} />
              <button
                type="submit"
                aria-label={`Delete saved view: ${view.name}`}
                onClick={(event) => {
                  // Deletion is not undoable, so it confirms — the only
                  // destructive control on this screen.
                  if (!window.confirm(`Delete the saved view “${view.name}”?`)) {
                    event.preventDefault();
                  }
                }}
                className="cursor-pointer rounded-full p-1 text-text/40 hover:text-text"
              >
                <X aria-hidden strokeWidth={1.5} className="size-3" />
              </button>
            </form>
          </span>
        );
      })}

      {/* Only offered once there is something worth saving. */}
      {canSave && (
        <button
          type="button"
          onClick={() => setNaming(true)}
          className="cursor-pointer rounded-full border border-dashed border-text-inverse/60 px-3 py-1 text-xs text-text-inverse hover:border-text-inverse hover:bg-text-inverse/10"
        >
          Save this view
        </button>
      )}

      <Modal open={naming} onClose={() => setNaming(false)} title="Save this view">
        <form action={formAction} className="flex flex-col gap-3 p-4">
          <input type="hidden" name="query" value={searchParams.toString()} />
          <label className="flex flex-col gap-1 text-sm text-text">
            Name
            <input
              name="name"
              maxLength={80}
              required
              autoFocus
              className="rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            />
          </label>
          {state.error && (
            <p role="alert" className="text-xs text-overdue">
              {state.error}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
