# spec04.md — F3 Search, Filters & Saved Views (UI)

**Phase P15 · Wave 1 · Backend: `cstg-backend/spec/spec04.md`**

`docs/UIUX_FRONTEND.md §5` specifies a global search in the staff top bar and `§7.3.4` an "All
tickets" view with filters for status, priority, plan, and overdue. `components/layout/top-bar.tsx`
has no search field and no ticket list has a filter control.

---

## 1. Scope

| Surface | Change |
|---|---|
| `components/layout/top-bar.tsx` | Global search field (staff) |
| `(staff)/tickets` | Filter bar, search results, saved views |
| `(staff)/queue`, `unassigned`, `overdue` | Filter bar on each |
| `(portal)/requests` | Simple search over own requests |
| `components/tickets/filters.tsx` | New — specced in `docs/FRONTEND_STRUCTURE.md §2`, never built |
| `components/ui/` | New `select.tsx`, `drawer.tsx` |

---

## 2. URL Is the State

Every filter and the search term live in the **URL query string**, not in component state.

```
/tickets?q=timeout&status=OPEN&priority=CRITICAL&tier=ENTERPRISE&cursor=…
```

This is not a stylistic preference; it is what keeps the feature server-rendered. The list pages are
Server Components that fetch with the session token. If filters lived in client state, the whole list
would have to move to the client, which would mean shipping the token or adding a client fetch path —
both of which `docs/FRONTEND_STRUCTURE.md §5` rules out.

It also makes a filtered view shareable, bookmarkable, and correct under back/forward, and it is why
no global store is needed (`§8`).

Pages read `searchParams`, build a typed `TicketFilters`, and pass it to the existing
`loadQueue`/`listTickets`. The filter bar is a small client component that only rewrites the URL via
`useRouter().replace()` with `scroll: false`.

---

## 3. Filter Bar

`components/tickets/filters.tsx` — client component.

Controls, all optional, all reflected in the URL:

| Control | Type | Visible to |
|---|---|---|
| Search | text, debounced 300ms | all staff |
| Status | select | all staff |
| Priority | select | all staff |
| Category | select | all staff |
| Plan (tier) | select | dispatcher, admin |
| Assignee | combobox | dispatcher, admin |
| Created | date range | all staff |
| Overdue only | checkbox | all staff |
| Escalated only | checkbox | all staff |

**Role-gated controls are absent, not disabled** — `docs/UIUX_FRONTEND.md §1.2`. An agent has no
assignee filter because every ticket they can see is already theirs; rendering it disabled would
imply a capability that does not exist. The backend rejects a forbidden filter with 403 regardless
(`spec04.md §4`), and if that 403 ever surfaces it is a UI bug, so it renders the generic error copy
rather than a friendly explanation.

Active filters render as removable chips above the list with a "Clear all". Without them a user who
scrolled past the bar sees an inexplicably short list — the classic filter trap.

**Mobile:** the bar collapses into a `Drawer` behind a `ListFilter` button showing the active count.

---

## 4. Search Field

In `top-bar.tsx` for staff, `Search` icon, placeholder "Search tickets". Submitting navigates to
`/tickets?q=…`. It is a navigation control, not a live-results dropdown: a typeahead panel would need
a client fetch path with the token, for a feature the full results page already serves.

Customers get a simpler field on `(portal)/requests` labelled "Search your requests" — same
mechanism, scoped by the backend.

Results render in the normal ticket table with matched terms **not** highlighted in the body. Bodies
can contain anything a customer pasted; injecting markup around matches in untrusted text is a risk
with no payoff at this scope.

Empty result: "No tickets match your filters." plus "Clear all" — directional, never a bare "0
results".

---

## 5. Pagination Under Search

The backend returns a 3-part cursor when `q` is present and rejects a cursor from the wrong query
shape with 400 (`spec04.md §5`). The UI must therefore **drop `cursor` from the URL whenever any
filter or the search term changes**. Keeping a stale cursor across a filter change produces a 400 on
the first interaction after filtering, which reads as a broken page.

One helper owns this: changing any filter rewrites the URL without `cursor`.

---

## 6. Saved Views

Staff only. Rendered as a row of chips above the filter bar.

- "Save this view" appears when any filter is active; it opens a small modal for a name.
- Selecting a chip replaces the URL query with the saved filters.
- Each chip has a remove affordance with a confirm — deletion is not undoable.
- Duplicate name → 422 → inline "You already have a view with that name."
- A saved view containing a filter the owner may no longer use → 403 → the chip renders with a
  warning and offers deletion. Roles change; a view saved as a dispatcher does not vanish quietly
  when someone becomes an agent.

Fetched server-side in the `(staff)` layout and passed down, so no client fetch path is introduced.

---

## 7. Accessibility

- The search field is a real `<form>` with a submit button (visually compact, not hidden) — Enter
  submits, and it is reachable without a mouse.
- Filter changes announce the new result count through an `aria-live="polite"` region. A silent list
  change is invisible to a screen-reader user.
- Chips are buttons with accessible names ("Remove filter: Priority is Critical").
- The date range is two native `<input type="date">` — accessible for free, and correct on mobile.
- Debounce never swallows a submit: pressing Enter navigates immediately.

---

## 8. Tests

`lib/queue.test.ts` (extended) and a new `lib/filters.test.ts`
- `searchParams` → `TicketFilters` parsing: unknown keys dropped, invalid enum values dropped rather
  than passed through to the API, booleans coerced.
- `cursor` is dropped on any filter change (the 400 regression).
- Filter → URL round-trip is lossless.

`components/tickets/filters.test.tsx`
- Agent variant renders no assignee and no tier control.
- Active chips reflect the URL; "Clear all" empties it.
- Debounce does not delay an explicit submit.

`components/layout/top-bar.test.tsx`
- Search present for staff, absent for customers.

---

## 9. Definition of Done

Filters and search live entirely in the URL with no client fetch path added; role-forbidden controls
are absent; cursor is dropped on every filter change; saved views survive a role change without
breaking the page; result-count changes are announced; the mobile drawer shows the active filter
count.
