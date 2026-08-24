# spec01.md — V2 Program Index (Frontend)

Entry point for the v2 frontend specification. v1 is complete and is the baseline. Each document
below specifies a *delta* against the shipped UI and consumes the backend contract defined by the
matching file in `cstg-backend/spec/`.

This file is an index and the set of rules every feature spec inherits. It contains no feature
detail.

---

## 1. Feature Specs

| # | File | Feature | Backend | Phase | Wave |
|---|---|---|---|---|---|
| F0 | [spec00.md](spec00.md) | Deployment foundations — proxy, env contract, CSRF, cookies | `spec00.md` | **0B** | — |
| F1 | [spec02.md](spec02.md) | Conversation — customer replies | `spec02.md` | P13 | 1 |
| F2 | [spec03.md](spec03.md) | Attachments end-to-end | `spec03.md` | P14 | 1 |
| F3 | [spec04.md](spec04.md) | Search, filters & saved views | `spec04.md` | P15 | 1 |
| F4 | [spec05.md](spec05.md) | Lifecycle v2 — pause & reopen | `spec05.md` | P16 | 2 |
| F5 | [spec06.md](spec06.md) | SLA policy configuration | `spec06.md` | P17 | 2 |
| F6 | [spec07.md](spec07.md) | Assignment automation | `spec07.md` | P18 | 2 |
| F7 | [spec08.md](spec08.md) | Notifications | `spec08.md` | P19 | 3 |
| F8 | [spec09.md](spec09.md) | Metrics v2 & export | `spec09.md` | P20 | 3 |
| F9 | [spec10.md](spec10.md) | Bulk dispatch operations | `spec10.md` | P21 | 3 |

Numbers match across both repos: `spec04.md` is search on both sides.

---

## 2. The Rule That Governs All of Them

> **The frontend consumes truth, it never owns it.** (`docs/UIUX_FRONTEND.md §1.1`)

Every v2 feature adds a way for the UI to be wrong about authorization, SLA state, or what
transitions are available. In each case the backend is authoritative and the UI is a convenience.
Concretely, for every feature below:

- **Route guards and hidden controls are UX, never security.** Hiding a button a role cannot use
  saves them a 403; it does not prevent one. `lib/auth/guards.ts` and `config/nav.ts` stay
  advisory.
- **Never re-derive a backend decision.** If the backend says which transitions are available, render
  those. Do not compute eligibility from role + status in two places and hope they agree.
- **The SLA countdown remains display-only** (NFR-1). It is a timer over a server timestamp with no
  authority over any outcome — including after spec05 makes that timestamp movable.

---

## 3. Inherited Rules

These come from `docs/UIUX_FRONTEND.md` and `docs/FRONTEND_STRUCTURE.md` and are not restated in each
feature spec.

**Contract.** Types regenerate with `npm run gen:api` into `src/lib/api/generated/`, which is never
hand-edited. `src/lib/types.ts` re-exports rather than redefines, so a backend rename fails the
build — the intended drift alarm. Every v2 phase begins by regenerating.

**Labels.** No backend enum is rendered directly. Every user-facing string passes through
`src/lib/labels.ts`, which carries two vocabularies: `customer` (gentlest wording) and `staff`
(precise but plain). New enum members — `PENDING_CUSTOMER`, `ATTACHMENT` — need both columns before
they can appear anywhere. Priority stays hidden from customers.

**Tokens.** Colour and radius come from `src/styles/tokens.css` through `tailwind.config.ts`. No hex
literal in JSX. The radius scale is *replaced*, not extended: working surfaces are `rounded-sm`,
expressive chrome may be `rounded-lg`/`rounded-xl`. `src/lib/design-tokens.test.ts` fails the build
on violations, and it must be extended, not exempted, when a new component category appears.

**Colour discipline.** The gold accent marks the single primary action and interactive affordances —
never status. `on-track` / `at-risk` / `overdue` signal SLA state only, as small dots, thin bars, and
badge text. `--chart-*` are identity-only. Nothing new borrows across these three sets.

**Server by default.** Server Components fetch; Server Actions mutate. `"use client"` only for real
interactivity. `src/lib/auth/session.ts` is `server-only` and the JWT never reaches the bundle.

**Results, not exceptions.** All HTTP goes through `src/lib/api/client.ts` and returns
`ApiResult<T>`. Every call site handles `ok: false`. Error copy follows the table in
`docs/UIUX_FRONTEND.md §8` — 404 and 403-on-a-hidden-resource share wording so the UI never reveals
that something exists.

**No global store.** Server Components plus local state. Redux/Zustand remain out
(`docs/FRONTEND_STRUCTURE.md §8`); nothing in v2 justifies one, and each spec that might have wanted
one says how it avoids it.

**Accessibility.** Colour is never the sole signal — every status pairs a dot with text. Hit targets
≥40px, `cursor-pointer` on everything interactive, visible accent focus ring, Esc closes overlays,
`prefers-reduced-motion` respected. New interactive patterns (multi-select, comboboxes, popovers)
carry their own keyboard contract in their spec.

**Responsive.** The customer portal is mobile-first — customers report problems from a phone. Staff
tables become stacked cards under `md`; the sidebar collapses to a drawer.

---

## 4. Missing Primitives

`docs/FRONTEND_STRUCTURE.md §2` lists `select.tsx` and `drawer.tsx`; neither was built. v2 needs both
and adds three more. They are built in the phase that first needs them, listed here so they are not
built twice:

| Primitive | First needed | Notes |
|---|---|---|
| `ui/select.tsx` | P15 (filters) | Native `<select>` styled to tokens. Not a custom listbox — a native control is accessible for free and is the right default. |
| `ui/drawer.tsx` | P15 (filter panel) | Mobile filter surface; shares the focus trap with `modal.tsx`. |
| `ui/checkbox.tsx` | P21 (bulk select) | Needs an indeterminate state for select-all. |
| `ui/combobox.tsx` | P18 (agent picker) | The one place a custom widget is justified — searching a staff list. Full ARIA combobox pattern; its keyboard contract is specified in spec07. |
| `ui/tabs.tsx` | P20 (dashboard) | Roving tabindex. |

---

## 5. Testing Posture

Vitest + Testing Library, `src/**/*.test.{ts,tsx}`. v1 tests pure logic (`lib/`) and primitive
behaviour; v2 keeps that scope and adds:

- **Label completeness.** Every new enum member has entries for both audiences. This is a table test,
  not a spot check — a missing label renders an enum name to a user.
- **Audience separation.** For any component with customer and staff variants, assert the customer
  variant never renders staff vocabulary (`priority`, `Internal note`, `Escalated`).
- **Error-state rendering.** Each new surface renders the correct copy for 403 / 404 / 409 / 422 /
  500 from `docs/UIUX_FRONTEND.md §8`.
- **Token compliance.** `design-tokens.test.ts` extended to cover new component directories.

E2E journeys stay in the backend's remit (`docs/TESTING.md §6`).

---

## 6. Definition of Done

Per `docs/IMPLEMENTATION.md §6`, plus: types regenerated; every new enum member labelled for both
audiences; `npm run typecheck`, `npm run lint`, and `npm test` green; the surface verified at mobile
width; no raw hex, no unmapped radius, no undeclared client component.
