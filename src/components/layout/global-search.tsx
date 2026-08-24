/**
 * Global search (docs/UIUX_FRONTEND.md §5).
 *
 * A plain <form> with a GET action, so it is a Server Component and needs no
 * JavaScript: Enter submits, the browser builds `?q=...`, and the destination
 * page re-renders server-side with the results.
 *
 * Deliberately not a typeahead panel. Live results would need a client fetch
 * path carrying the token, for a feature the full results page already serves
 * (spec04 frontend §4).
 */

import { Search } from "lucide-react";

export function GlobalSearch({
  action,
  placeholder,
}: {
  action: string;
  placeholder: string;
}) {
  return (
    <form action={action} method="get" role="search" className="flex items-center gap-1">
      <label htmlFor="global-search" className="sr-only">
        {placeholder}
      </label>
      <div className="flex items-center gap-2 rounded-sm bg-text-inverse/10 px-2 py-1.5">
        <Search aria-hidden strokeWidth={1.5} className="size-4 text-text-inverse/70" />
        <input
          id="global-search"
          type="search"
          name="q"
          placeholder={placeholder}
          className="w-36 bg-transparent text-sm text-text-inverse placeholder:text-text-inverse/60 focus-visible:outline-none sm:w-56"
        />
      </div>
      {/* Visually compact but present and focusable — Enter is not the only way
          to submit, so the control is reachable without a pointer or a keyboard
          convention the user has to guess. */}
      <button
        type="submit"
        className="cursor-pointer rounded-sm px-2 py-1 text-sm text-text-inverse/80 hover:bg-text-inverse/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Go
      </button>
    </form>
  );
}
