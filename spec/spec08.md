# spec08.md — F7 Notifications (UI)

**Phase P19 · Wave 3 · Backend: `cstg-backend/spec/spec08.md`**

`docs/UIUX_FRONTEND.md §5` puts a `Bell` in the top bar; `§7.1.6` promises *"A `Bell` badge flags new
replies."* Neither exists. Both a customer waiting on an answer and an agent waiting on a log file
currently have to refresh the page to find out anything happened.

---

## 1. Scope

| Surface | Change |
|---|---|
| `components/layout/top-bar.tsx` | Bell with unread badge |
| `components/notifications/` | New: `notification-bell.tsx`, `notification-panel.tsx` |
| `hooks/use-notifications.ts` | New — polling and unread count |
| `lib/api/notifications.ts` | New typed module |
| `lib/labels.ts` | One plain sentence per event type, per audience |

The bell appears in **both** shells. `(portal)` gets it too — a customer waiting on a reply is the
clearest case in the product.

---

## 2. Polling, Not Push

`docs/ARCHITECTURE.md §10` freezes out websockets, and the backend design is a read model with no
push channel (`spec08.md §2`). The client polls.

| When | What |
|---|---|
| On mount | `GET /notifications/count` |
| Every 60s while the tab is visible | `GET /notifications/count` |
| On tab regaining focus | `GET /notifications/count` immediately |
| On opening the panel | `GET /notifications?limit=20` |

**Polling stops when the tab is hidden**, via `document.visibilityState` and a `visibilitychange`
listener. A background tab polling every minute for hours is pure waste, and the focus-triggered
refresh means a returning user sees a current count immediately anyway — which is the moment that
actually matters.

60 seconds is deliberate. This is a badge, not a chat client: the count being a minute stale costs
nothing, and a tighter interval multiplies load across every open tab for no perceptible gain.

The count endpoint is separate from the list endpoint precisely so the frequent call stays cheap;
the UI must not poll the list to derive a count.

---

## 3. Client Fetch — the Exception, and Why It Is Safe

Everything else in v2 fetches server-side. Polling cannot: a Server Component does not re-run on a
timer.

`hooks/use-notifications.ts` therefore calls **a Next.js route handler on the same origin**, not the
backend directly:

```
app/api/notifications/count/route.ts   →  reads session cookie → backend → JSON
app/api/notifications/route.ts         →  same
app/api/notifications/read/route.ts    →  POST passthrough
```

The httpOnly cookie is sent automatically by the browser to same-origin routes; the route handler
reads it with `getSession()` and adds the bearer header server-side. **The token never enters the
bundle**, which is the whole reason `lib/auth/session.ts` is `server-only`.

Calling the backend directly from the client would require the token in JavaScript and would undo
that decision for a badge count.

---

## 4. Bell & Badge

`components/notifications/notification-bell.tsx` — client component.

- `Bell` icon, matching `docs/UIUX_FRONTEND.md §2.7`.
- Unread badge: a small accent dot with the count, capped at "99+" (the backend caps at 99).
- Zero unread → **no badge at all**, not a badge showing 0.
- Accessible name is the state, not the widget: `aria-label="Notifications, 7 unread"`. A bare "Bell"
  tells a screen-reader user nothing.
- Count changes announce through `aria-live="polite"` — the only way a non-visual user learns a
  poll returned something.

The badge is one of the few sanctioned uses of the accent outside a primary CTA: `§2.1` allows it for
"interactive affordances", and an unread marker is not a status signal, so it must not use
`on-track`/`at-risk`/`overdue`.

---

## 5. Panel

`notification-panel.tsx` — a popover, not a modal. Reading notifications is a glance, and a
focus-trapping overlay is the wrong weight for it.

Each row: an icon for the event type, one plain sentence, the ticket subject, and a relative
timestamp. The whole row is a link to the ticket, `cursor-pointer`, ≥40px tall.

Rows are sentences, never enum names — `lib/labels.ts` per spec01 §3:

| Event | Customer | Staff |
|---|---|---|
| `COMMENT` (public reply) | "Support replied to your request" | "{name} replied" |
| `STATUS_CHANGE` | "Your request is now {status}" | "{name} moved this to {status}" |
| `SLA_BREACH` | "Taking longer than expected" | "SLA breached" |
| `CREATED` | *(never — self-authored)* | "{name} raised a ticket" |

Customers never see an `INTERNAL_NOTE` notification. The backend filters on `detail.type`
(`spec08.md §4`), and the UI must not be the only thing that would have prevented it — so the
customer variant is tested against a payload containing one.

**Marking read.** Opening the panel calls `POST /notifications/read`, clearing the badge while the
list stays visible. This is the conventional behaviour and the right one: a badge that survives
reading is noise. Per-item read state is not offered — the cursor is a single timestamp, and a UI
implying otherwise would be lying about the model.

Empty state: `Bell` icon and "You're all caught up." — no CTA, because there is no action to
direct toward.

---

## 6. Error Handling

Notifications are ambient. A failure must never interrupt what the user is doing.

| Failure | Behaviour |
|---|---|
| Poll fails | Silent. Keep the last known count, retry next interval. No toast. |
| Poll fails repeatedly (3×) | Back off to 5 minutes until one succeeds. |
| Panel fetch fails | Inline in the panel: "Couldn't load notifications." + retry |
| 401 | Redirect to sign-in — the session is genuinely gone |

A toast on every failed background poll would be worse than the outage it reports.

---

## 7. Tests

`hooks/use-notifications.test.ts`
- Polls on mount and on interval; **stops while hidden**; refetches immediately on focus.
- Backs off after three consecutive failures and recovers after a success.
- A failed poll preserves the previous count rather than zeroing it.

`components/notifications/notification-bell.test.tsx`
- No badge at zero; "99+" above the cap.
- `aria-label` carries the count; changes announce.

`components/notifications/notification-panel.test.tsx`
- Customer variant renders no internal-note row **even when one is present in the payload**.
- Customer variant contains no staff names and no priority vocabulary.
- Opening marks read and clears the badge without emptying the list.
- Empty state renders with no CTA.

`lib/labels.test.ts`
- Every notifiable event type has a sentence for both audiences (table test).

---

## 8. Definition of Done

The bell appears in both shells with a live count; polling pauses on hidden tabs and resumes on
focus; the token never reaches the browser — verified by the absence of any direct backend call from
client code; customers cannot be notified about internal notes even if the payload contains one;
failures are silent and self-recovering.
