# spec07.md — F6 Assignment Automation (UI)

**Phase P18 · Wave 2 · Backend: `cstg-backend/spec/spec07.md`**

`components/forms/assign-dialog.tsx` lists agents by name with no indication of who is drowning.
Agents cannot take work themselves — `docs/UIUX_FRONTEND.md §7.2.5` records the v1 rule:
*"Reassignment requests go to a dispatcher (agents can't reassign)."* Claiming an unassigned ticket
is not reassignment, and it is what the queue actually needs at 02:00.

---

## 1. Scope

| Surface | Change |
|---|---|
| `(staff)/tickets/[id]` | "Take this ticket" for agents |
| `(staff)/queue` | Unassigned section with inline claim |
| `components/forms/assign-dialog.tsx` | Search, live load, capacity, override |
| `(staff)/users` | Capacity and auto-assign eligibility per agent |
| `(staff)/configuration` | Strategy and auto-assign settings |
| `components/ui/combobox.tsx` | New |

---

## 2. Claim

**On the detail page.** An `AGENT` viewing an unassigned ticket gets a secondary "Take this ticket"
in the action panel. It sits above the transition buttons because it is the prerequisite: T1 requires
an assignee, and the panel's current empty-state copy already says "Assign an agent before work can
start." For an agent who can now do that themselves, that message becomes a button.

**In the queue.** `(staff)/queue` gains an "Unassigned" section above the agent's own tickets, with
an inline claim on each row. This is the flow that matters — an agent scanning for work should not
have to open a ticket to take it.

Claim is a Server Action in `app/actions/staff.ts` → `revalidatePath`. Success toasts "Ticket is
yours" and, from the queue, leaves the user in place; the row moves from Unassigned into their
tickets on re-render. Navigating away from a list on every claim would break the scan.

| Backend | Copy |
|---|---|
| 409 (already claimed) | "Someone else just took this one." — the row disappears on refresh |
| 422 (at capacity) | "You're at your ticket limit ({n}). Resolve something first." |

The 409 is a **normal outcome**, not an error condition: two agents scanning the same queue will race,
and the copy should read as information rather than failure. It uses toast-neutral styling, not the
error variant.

---

## 3. Assign Dialog

`assign-dialog.tsx` becomes a combobox over `GET /users?role=AGENT&is_active=true`, which now returns
`open_ticket_count`, `max_open_tickets`, and `accepts_auto_assignment`.

Each option renders name, then load as **text and a thin bar**: `12 / 15 open`. Colour is never the
sole signal (`docs/UIUX_FRONTEND.md §9`), so the number carries the meaning and the bar is
reinforcement. The bar uses the `structure` token — load is not SLA health, so it must not borrow
`on-track`/`at-risk`/`overdue`.

**At-capacity agents remain selectable, marked "At limit".** Removing them would hide the person a
dispatcher may need during an incident, and the backend supports an explicit override. Selecting one
reveals a checkbox — "Assign anyway (over their limit)" — which maps to `override_capacity`. The
override is deliberate, per-assignment, and recorded in the audit event.

Agents who opted out of automation are **not** marked in this dialog. `accepts_auto_assignment`
governs the automatic path only; a dispatcher assigning by hand has already made the decision that
flag exists to defer.

### Combobox keyboard contract

The one custom widget v2 adds, so its contract is specified rather than assumed: `role="combobox"`
with `aria-expanded` and `aria-controls`; ↓/↑ move `aria-activedescendant` through the listbox;
Enter selects; Esc closes and returns focus to the input; typing filters; the option count is
announced through a live region. Native `<select>` is used everywhere else in v2 precisely so this
is the only place carrying this burden.

---

## 4. Users Screen

`(staff)/users` gains two columns and two controls per agent:

| Column | Control |
|---|---|
| Open tickets | read-only, `12 / 15` |
| Ticket limit | number input, blank = no limit |
| Auto-assign | toggle |

Both write through `PATCH /users/{id}` alongside the existing activate/deactivate.

The blank-means-unlimited convention needs a visible label — "No limit" as placeholder text — because
an empty numeric field otherwise reads as unset-and-broken.

`accepts_auto_assignment` needs a plain-language label. "Include in automatic assignment" says what
it does; the field name does not.

---

## 5. Configuration

`(staff)/configuration` gains an "Assignment" section:

- **Strategy** — radio group, not a select, because the three options need explanation and a select
  hides it:
  - *Manual* — "Tickets stay unassigned until a dispatcher assigns them."
  - *Round robin* — "Take turns, skipping anyone at their limit."
  - *Least loaded* — "Give each ticket to whoever has the fewest open tickets."
- **Auto-assign new tickets** — toggle, with the consequence stated: "New tickets are routed
  automatically when they arrive. If no agent is available they stay unassigned."

That second sentence matters. `select` returning `None` is a normal outcome that leaves a ticket
unassigned, and a dispatcher who does not expect it will read it as automation failing.

Setting strategy to Manual disables the auto-assign toggle — the only place in v2 where disabling
beats hiding, because the dependency between the two controls is the information being conveyed.

---

## 6. Automated Assignment in the Timeline

`ASSIGNMENT` events with `actor_type: "SYSTEM"` need their own sentence, distinct from a human's:

| Actor | Staff timeline |
|---|---|
| USER | "{name} assigned this to {agent}" |
| SYSTEM | "Assigned automatically to {agent}" |

The SLA monitor is the only `SYSTEM` actor the UI has rendered so far; automated assignment is the
second. Without a distinct sentence, an automatic assignment renders with an empty actor name.

Customers see no `ASSIGNMENT` events at all — unchanged, and the reason is recorded in
`ticket_service.py`: who works a ticket is internal routing.

---

## 7. Tests

`components/forms/assign-dialog.test.tsx`
- Load renders as text, not colour alone.
- At-limit agents selectable and marked; the override checkbox appears only after selecting one.
- Combobox keyboard contract: arrows, Enter, Esc-restores-focus, type-to-filter.

`components/tickets/action-panel.test.tsx`
- "Take this ticket" for an agent on an unassigned ticket; absent when assigned; absent for
  dispatcher and customer.

`app/actions/staff` claim tests
- 409 renders neutral "someone else took it" copy, not error styling.
- 422 renders the capacity message with the actual limit.

`lib/labels.test.ts`
- `SYSTEM` actor assignment sentence present; no empty-name rendering path.

`(staff)/configuration` test
- Auto-assign toggle disabled under Manual; the no-agent-available consequence text is present.

---

## 8. Definition of Done

Agents can claim unassigned tickets from both the queue and the detail page; a lost claim race reads
as information, not failure; agent load is legible without relying on colour; capacity override is
explicit and per-assignment; automated assignments render with their own timeline sentence; the
combobox meets its stated keyboard contract.
