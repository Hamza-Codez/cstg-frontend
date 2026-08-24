# spec10.md — F9 Bulk Dispatch Operations (UI)

**Phase P21 · Wave 3 · Backend: `cstg-backend/spec/spec10.md`**

The final phase. A dispatcher facing 60 unassigned tickets after a weekend currently opens, assigns,
and confirms each one — 180 interactions for a single routing decision.

---

## 1. Scope

| Surface | Change |
|---|---|
| `components/tickets/ticket-table.tsx` | Row selection |
| `components/tickets/bulk-action-bar.tsx` | New — appears when rows are selected |
| `components/tickets/bulk-result-dialog.tsx` | New — per-item outcomes |
| `(staff)/unassigned`, `tickets`, `overdue` | Selection enabled |
| `(staff)/users` | "Reassign all tickets" per agent |
| `components/ui/checkbox.tsx` | New — needs an indeterminate state |

---

## 2. Selection

`ticket-table.tsx` gains an optional `selectable` mode — off by default, so the customer portal and
the agent queue are unaffected.

- Checkbox column, plus a header checkbox that is **indeterminate** when some rows are selected. A
  two-state header checkbox after selecting three of twenty rows is actively misleading.
- Selection is **client state**, deliberately unlike the URL-based filters in spec04. A selection is
  ephemeral, page-scoped, and meaningless to share; putting 60 UUIDs in the URL would be both ugly
  and fragile. It is `useState` in the page's client boundary — still no global store.
- **Selection clears when filters or the page change.** Carrying a hidden selection across a filter
  change is how someone assigns tickets they can no longer see. This is the single most important
  rule on this screen.
- Header checkbox selects the **current page only**, and the bar says so: "12 selected on this page."
  A "select all matching" that silently spans pages the user never looked at is exactly the kind of
  action that goes wrong at scale.
- Shift-click extends a range — expected in any table with checkboxes, and cheap.
- Row click still navigates to the ticket; only the checkbox toggles. Overloading row click with
  selection makes both worse.

### Accessibility

The header checkbox uses `indeterminate` on the DOM node (not a CSS approximation) so it is announced
correctly. Selection count changes announce through `aria-live="polite"`. Every checkbox has an
accessible name naming its row's ticket, never a bare "Select".

---

## 3. Bulk Action Bar

`bulk-action-bar.tsx` — appears above the table when the selection is non-empty. Not a floating
overlay: it sits in the layout so it never covers a row the user is deciding about.

| Action | Roles | Confirmation |
|---|---|---|
| Assign to… | dispatcher, admin | Combobox (reused from spec07), then confirm |
| Close | agent (assigned), dispatcher, admin | Confirm dialog with the count |
| Reassign from… to… | dispatcher, admin | Two comboboxes, confirm |

**Only "Close" is offered as a bulk transition.** The backend restricts bulk transitions to `CLOSED`
(`spec10.md §5`), and the UI must not offer a Resolve or Start that would 422 — offering an action
that cannot succeed is worse than not offering it.

Every bulk action confirms first, stating the count and the effect: "Close 23 tickets? This can't be
undone." Bulk actions are the highest-consequence controls in the product and the only place in v2
where a confirm step is mandatory.

Actions are absent for roles that lack them, per `docs/UIUX_FRONTEND.md §1.2`.

---

## 4. Partial Success — the Central UI Problem

The backend returns **200 with per-item results** even when items failed (`spec10.md §3`). A toast
saying "Done" would be a lie, and a toast saying "Failed" would be a worse one.

`bulk-result-dialog.tsx` opens whenever `failed > 0`:

> **57 of 60 tickets assigned to Dana Reed.**
>
> 3 couldn't be assigned:
> - *Payment gateway timeout* — someone else updated this ticket
> - *SSO login failure* — Dana is at their ticket limit
> - *Export job stuck* — ticket not found

- Successes are a count; failures are itemised **with the ticket subject**, because a UUID is not
  something a dispatcher can act on.
- Error codes become the plain sentences from `docs/UIUX_FRONTEND.md §8` — `STATE_CONFLICT` →
  "someone else updated this ticket", `BUSINESS_RULE_VIOLATION` → the specific rule,
  `NOT_FOUND` → "ticket not found".
- **"Retry failed" re-runs the operation on the failed ids only.** Conflicts are frequently transient,
  and re-running the whole batch would redo 57 successful assignments.
- **The selection is preserved for the failed items and cleared for the successful ones**, so the
  table state matches what the dialog just said.

When everything succeeds, no dialog — a toast: "23 tickets closed."

Long failure lists cap at 10 with "…and 4 more", scrolling within the dialog.

---

## 5. Reassign an Agent's Queue

On `(staff)/users`, each agent row gets "Reassign all tickets" — the going-on-leave operation. It
uses the server-side selection endpoint (`from_assignee_id` / `to_assignee_id` / `statuses`), so the
dispatcher never enumerates ids.

The dialog asks for the target agent and which statuses to move, defaulting to `OPEN` and
`IN_PROGRESS` and **excluding `PENDING_CUSTOMER`** by default — a ticket waiting on a customer is not
active work, and moving it creates churn when the customer replies. It remains a checkbox for the
cases where it is wanted.

It is offered on **active and inactive** agents. `docs/API.md §10` is explicit that deactivation
"only stops **new** assignments"; the existing ones need moving, and until now there was no way.

Over the 100-item cap → 422 → "That agent has more than 100 tickets. Narrow by status and try again."

---

## 6. Guardrails

Three, and they are what keep this feature from being dangerous:

1. **Confirm every bulk action**, with the count in the confirmation.
2. **Never select across pages.** The count always says "on this page".
3. **Clear selection on any filter change**, so a selection can never outlive the view it was made
   in.

---

## 7. Tests

`components/ui/checkbox.test.tsx`
- Indeterminate is set on the DOM node and announced.

`components/tickets/ticket-table.test.tsx`
- Header checkbox selects the current page only; goes indeterminate on partial selection.
- **Selection clears on filter change** (the load-bearing test).
- Row click navigates; checkbox click does not.
- Shift-click extends a range.
- `selectable` off by default — the portal and agent queue render no checkboxes.

`components/tickets/bulk-action-bar.test.tsx`
- Agent sees Close only; customer sees the bar not at all.
- No Resolve or Start option is offered.
- Count in the confirm dialog matches the selection.

`components/tickets/bulk-result-dialog.test.tsx`
- Mixed result renders the success count and itemised failures with subjects.
- Each error code maps to its plain sentence.
- "Retry failed" submits only the failed ids.
- All-success path shows a toast and no dialog.
- Over 10 failures truncates with a count.

---

## 8. Definition of Done

Selection is page-scoped, clears on filter change, and never spans pages; every bulk action confirms
with its count; partial results are itemised by ticket subject with actionable copy and a
failed-only retry; only Close is offered as a bulk transition; the agent-queue reassignment works for
inactive agents; the header checkbox's indeterminate state is real and announced.
