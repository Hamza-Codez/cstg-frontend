# spec06.md — F5 SLA Policy Configuration (UI)

**Phase P17 · Wave 2 · Backend: `cstg-backend/spec/spec06.md`**

`(staff)/configuration` renders the priority matrix as an editable grid and SLA durations as a
read-only reference, exactly as `docs/UIUX_FRONTEND.md §7.4.2` specified. The durations become
editable, versioned, and — the part that matters — explainable on any individual ticket.

---

## 1. Scope

| Surface | Change |
|---|---|
| `(staff)/configuration` | SLA durations become an editable form; version history |
| `(staff)/tickets/[id]` | The ticket's SLA window explains itself from its pinned version |
| `components/forms/sla-policy-form.tsx` | New |
| `components/config/policy-history.tsx` | New |

---

## 2. What This Screen Must Communicate

Editing SLA durations looks like it changes existing commitments. It does not — deadlines are frozen
at creation and pinned to a policy version. A user who does not know that will either avoid the
screen or expect a retroactive effect that never comes.

**The screen states the rule before the form, not after.** A short line above the inputs:

> Changes apply to new tickets only. Tickets already open keep the response times they were created
> under.

This mirrors the existing note on the priority matrix and comes straight from `docs/API.md §11`. It
is the single most important string on the page.

---

## 3. Duration Form

`components/forms/sla-policy-form.tsx` — client component, four rows.

| Priority | Response time |
|---|---|
| Critical | `[ 2 ]` hours |
| High | `[ 8 ]` hours |
| Medium | `[ 24 ]` hours |
| Low | `[ 72 ]` hours |

- **Input is hours, the wire is seconds.** Nobody configures an SLA in seconds; a form that demands
  7200 invites a wrong-by-60× typo. Conversion happens in the Server Action, and non-integer hours
  are supported (0.5h) because sub-hour targets are real.
- All four submit together as one object — the backend requires a total policy, and a per-row save
  would pass through states that are not total. One "Save changes" button for the group, which also
  keeps the one-primary-CTA rule.
- Optional "note" field ("Q3 enterprise terms"). It is what the history screen shows to explain *why*
  a version exists, and it is the difference between a useful audit and a list of dates.
- Client validation mirrors the backend for feedback: positive, ≤ 90 days.

**Ordering warning, not error.** If a configuration makes a lower priority faster than a higher one
(`HIGH` 8h, `CRITICAL` 12h), warn inline — "Critical is slower than High. Is that intended?" — and
still allow saving. The backend permits it and there are real reasons for unusual ladders; blocking
it would be the UI inventing a rule, which spec01 §2 forbids.

---

## 4. Version History

`components/config/policy-history.tsx` — Server Component, `GET /configuration/sla-policy/history`.

A table: activated date, who activated it, the note, the four durations, and an "Active" badge on the
current one. Newest first. Read-only — versions are immutable, so there is nothing to edit and no
row-level action.

Presented as a collapsed section beneath the form. It is reference material for answering "why did
this ticket have a six-hour window", not something an admin reads daily.

---

## 5. Explaining an Individual Ticket

The reason versioning exists. `(staff)/tickets/[id]`'s properties panel currently shows a due time
with no provenance.

`TicketDetailResponse` embeds the ticket's pinned policy, so the panel can render:

> **Due by** 3:00 PM
> 2-hour target · Critical · policy of 12 Aug 2026

with the third line muted and secondary. Without it, a ticket created under an old policy looks like
a bug against the current configuration.

**Staff only.** Customers see "Expected resolution by" and nothing about policy versions
(`docs/UIUX_FRONTEND.md §4` hides priority from them entirely, and a policy version is a
sharper-edged version of the same internal detail).

---

## 6. Error Handling

| Backend | Copy |
|---|---|
| 422 (missing/duplicate priority) | "Set a response time for all four priorities." |
| 422 (out of range) | Inline on the field: "Enter between 1 minute and 90 days." |
| **409 (concurrent activation)** | "Another admin just changed this. Refresh to see the latest." + refresh action |
| 403 | "You don't have access to this." |

The 409 is the interesting one and it is real: two admins saving at once is exactly what the
backend's partial unique index arbitrates. The copy is the standard 409 wording from
`docs/UIUX_FRONTEND.md §8` — no special case, because a user does not need to know about unique
indexes.

---

## 7. Tests

`components/forms/sla-policy-form.test.tsx`
- Hours→seconds conversion, including fractional hours (0.5 → 1800).
- All four rows submit as one payload; no per-row save exists.
- Inverted ladder warns but does not block submission.
- Zero, negative, and over-cap values blocked inline.
- The "new tickets only" notice renders above the form.

`components/config/policy-history.test.tsx`
- Newest first; active badge on exactly one row; empty note renders without a gap.

`(staff)/tickets/[id]` panel test
- Provenance line renders for staff, is absent for customers.

---

## 8. Definition of Done

Durations are editable in hours and submitted as a whole policy; the "applies to new tickets only"
notice is present and prominent; history explains each version with its note and author; any ticket
can state which policy it was created under; the 409 path is handled with a refresh affordance.
