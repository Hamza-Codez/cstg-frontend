# spec05.md — F4 Lifecycle v2: Pause & Reopen (UI)

**Phase P16 · Wave 2 · Backend: `cstg-backend/spec/spec05.md`**

The UI change with the widest reach in v2. A fifth status appears, the countdown starts counting to a
different field, and — for the first time — a customer gets action buttons.

---

## 1. The One-Line Change That Touches Everything

> **The countdown counts to `sla_due_at`, not `deadline`.**

`deadline` stays in the response as the record of the original promise. `sla_due_at` is the current
effective due time. Every timer, badge, sort, and "Due by" string switches.

Missing one instance produces a countdown that silently ignores every pause — the exact failure the
backend design went out of its way to prevent. So this phase begins with an exhaustive audit of
`deadline` in `src/`, and the only surviving uses are the ones that deliberately mean *the original
promise*:

| File | Change |
|---|---|
| `lib/sla.ts` | `slaState(dueAtIso, now, createdAtIso)` — argument renamed and repurposed |
| `hooks/use-sla-countdown.ts` | Ticks to `sla_due_at` |
| `components/sla/sla-countdown.tsx` | New `paused` state; prop renamed |
| `lib/queue.ts` | `byUrgency` sorts on `sla_due_at` |
| `lib/staff-queue.ts` | Unchanged (delegates) |
| Both detail pages, ticket table | Prop renamed |

Rename the prop from `deadline` to `dueAt` rather than quietly changing what `deadline` means.
A renamed prop makes every call site a compile error, which is how the audit becomes exhaustive
instead of hopeful.

---

## 2. The Paused State

`lib/sla.ts` gains a fourth state:

```ts
export type SlaState = "on-track" | "at-risk" | "overdue" | "paused";
```

`slaState` returns `"paused"` — ahead of every other check — when the ticket is `PENDING_CUSTOMER`.
A paused ticket is never at-risk and never overdue no matter how far past its stored `sla_due_at`
the clock has run, because that value is stale by design while paused (`spec05.md §5`).

The pure function takes status as an argument rather than reading it from a ticket object, keeping it
unit-testable in the style of the existing module.

### Rendering

| State | Staff | Customer |
|---|---|---|
| `paused` | `Clock` in muted text, "Paused — waiting on customer" | "Waiting for your reply" |
| overdue | red, "Overdue by 1h 20m" | "Taking longer than expected" |
| at-risk | gold, "48m left" | "Expected by 3:00 PM" |
| on-track | green dot, "2h 41m left" | "Expected by 3:00 PM" |

Paused uses **muted text, not a signalling colour.** `on-track`/`at-risk`/`overdue` mean SLA health,
and paused is the absence of a running clock, not a health verdict. Giving it green would say
"healthy" about a ticket nobody is working.

The countdown **stops ticking** when paused. A frozen number and a running one look identical for the
first second; the label carries the meaning, which is also why colour is never the sole signal here.

---

## 3. New Status Labels

`PENDING_CUSTOMER` needs both audiences in `lib/labels.ts` before it can render anywhere:

| Backend | Customer | Staff |
|---|---|---|
| `PENDING_CUSTOMER` | "Waiting for your reply" | "Waiting on customer" |

The customer wording is a direct request for action. "Pending customer" describes the ticket from the
support desk's side; the customer needs to know *they* are the blocker.

`StatusBadge` gains the state with a muted dot, matching the countdown's reasoning.

---

## 4. Staff Actions

`components/tickets/action-panel.tsx` renders from `lib/transitions.ts`, which gains T4, T5, and T6.

| Transition | Button | Shown when |
|---|---|---|
| T4 IN_PROGRESS → PENDING_CUSTOMER | "Wait for customer" | assigned agent or admin |
| T5 PENDING_CUSTOMER → IN_PROGRESS | "Resume work" | assigned agent or admin |
| T6 RESOLVED → IN_PROGRESS | "Reopen" | assigned agent, dispatcher, admin, within the window |

`availableTransitions` currently returns at most one option because the v1 lifecycle is linear. It no
longer is: from `IN_PROGRESS` an agent can resolve **or** wait for customer. The panel's
"at most one primary CTA" rule from `docs/UIUX_FRONTEND.md §3.1` still holds — **"Resolve" is
primary, "Wait for customer" is secondary.** The panel's assumption of a single option must be
removed rather than worked around.

**The reopen window is a backend rule the UI must not duplicate.** `TicketResponse` does not carry
"is reopenable", so the frontend would have to recompute it from `resolved_at` plus a config value it
does not have. Instead: render "Reopen" for any `RESOLVED` ticket and let a 422 surface as
"This request was resolved too long ago to reopen. Start a new one." — one source of truth, per
spec01 §2. If reopen-eligibility becomes a common dead end, the fix is a backend field, not a client
calculation.

---

## 5. Customer Actions — a New Surface

`(portal)/requests/[id]` gains action buttons for the first time. Two, both narrow:

**"I've replied" / auto-resume.** A customer reply on a `PENDING_CUSTOMER` ticket resumes the clock
server-side, inside the reply's transaction. The UI does **not** send a separate transition — it just
posts the reply and re-renders. The composer gains a line above it when paused: "Support is waiting
for your reply." That is the whole interaction, and it is the right one: the customer's job is to
answer, not to operate a state machine.

**"This isn't fixed" (reopen).** On a `RESOLVED` ticket, a secondary button beside the reply
composer. Copy is the customer's words, not the system's — "Reopen" is our vocabulary
(`docs/UIUX_FRONTEND.md §4` maps every term this way).

Confirming reopens the request and posts the customer's explanation as a reply in the same flow:
a reopen with no reason is a ticket an agent has to chase. The modal asks "What's still wrong?" and
the reply is required.

Customers still see **no** Start / Resolve / Close controls. The rule the backend restated —
a customer may answer a question addressed to them, never assert that work was done — is visible in
the UI as exactly two buttons.

---

## 6. Queue Ordering

`lib/queue.ts` `byUrgency` sorts overdue → at-risk → by due time. Paused tickets join the ordering as
a **fourth tier, below on-track**: they are nobody's next action, and floating them near the top on a
stale due time would push real work down.

They stay visible rather than being filtered out — an agent needs to see what they are waiting on —
and the "Waiting on customer" filter from spec04 is how they get isolated.

---

## 7. Timeline

`STATUS_CHANGE` events for the new transitions need sentences in both vocabularies:

| Transition | Customer | Staff |
|---|---|---|
| T4 | "We're waiting for your reply" | "{actor} paused for customer" |
| T5 | "Work resumed" | "{actor} resumed work" |
| T6 | "Reopened" | "{actor} reopened this ticket" |

T4/T5/T6 are `STATUS_CHANGE` events, already inside `_CUSTOMER_VISIBLE_EVENTS`, so they reach the
customer timeline with no backend change — which means the labels must exist or an enum name renders.

---

## 8. Tests

`lib/sla.test.ts`
- `paused` returned for `PENDING_CUSTOMER` regardless of how far past `sla_due_at`.
- Every other state unchanged from v1 — the existing suite must pass with only the argument rename.
- The exact-deadline boundary still reads as not-overdue.

`lib/transitions.test.ts`
- T1–T6 availability per role and status, including both customer-permitted rows.
- `IN_PROGRESS` for an assigned agent returns two options with "Resolve" primary.

`lib/queue.test.ts`
- Paused tickets sort below on-track; a paused ticket long past due does not sort as overdue.

`components/sla/sla-countdown.test.tsx`
- Paused variant does not tick and uses no signalling colour.
- Customer paused variant reads "Waiting for your reply" and contains no alarm language.

`lib/labels.test.ts`
- `PENDING_CUSTOMER` and all new event sentences present for both audiences (table test).

---

## 9. Definition of Done

Every countdown, sort, and "due by" string reads `sla_due_at`, verified by the prop rename compiling
clean; `deadline` survives only where it deliberately means the original promise; paused tickets
never render as healthy or overdue; customers have exactly two actions and no transition controls;
every new status and event has both audience labels; the v1 SLA test suite passes unchanged apart
from the rename.
