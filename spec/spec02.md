# spec02.md — F1 Conversation: Customer Replies (UI)

**Phase P13 · Wave 1 · Backend: `cstg-backend/spec/spec02.md`**

Today `(portal)/requests/[id]` renders replies read-only — the page comment says *"support replies
(read-only in v1)"*. A customer reading "Could you send us the error log?" has nowhere to answer.

---

## 1. Scope

| Surface | Change |
|---|---|
| `(portal)/requests/[id]` | Reply composer; replies attributed to their author; conversation reads as a thread |
| `(staff)/tickets/[id]` | Existing composer unchanged; customer replies visually distinct in the list |
| `components/comments/` | New `reply-composer.tsx`; `timeline.tsx` renders author identity |
| `lib/labels.ts` | Author-attribution vocabulary for both audiences |

---

## 2. Contract Change to Absorb

`CommentResponse.author_id` is replaced by a nested object:

```ts
author: { type: "CUSTOMER" | "USER"; id: string; name: string }
```

This is a **breaking change and the phase starts with it**: run `npm run gen:api`, then fix the
compile errors. That is the drift alarm working as designed — every place that touched `author_id`
is a place that needs to decide how to render an author, and the type error is what finds them.

---

## 3. Customer Reply Composer

`components/comments/reply-composer.tsx` — client component (form state), used only in the portal.

Deliberately **not** a variant of the staff `comment-composer.tsx`. That component's entire job is
the internal-note/reply audience toggle, and a customer has no audience to choose. Sharing it would
mean a component that renders a control it must never render for one of its callers — one prop away
from leaking "Internal note" into the portal.

- Single textarea, label "Add a reply", placeholder "Tell us what's happening."
- Primary button "Send" — the action verb from `docs/UIUX_FRONTEND.md §4`, never "Submit".
- Client validation mirrors the backend for feedback only: 1–10,000 characters.
- Optimistically clears on success and shows a toast "Reply sent". On failure the text is
  **preserved** — losing a typed message to a network blip is the worst outcome this screen has.
- Submits through a Server Action in `app/actions/customers.ts`, which calls the typed
  `addComment(token, ticketId, { type: "PUBLIC_REPLY", body })` and `revalidatePath`s the detail
  route.

The `type` is hardcoded to `PUBLIC_REPLY` in the action and never comes from the form. A customer
cannot choose a comment type, so the wire must not carry a choice.

### Composer visibility

| Ticket status | Composer |
|---|---|
| OPEN, IN_PROGRESS, RESOLVED | Shown |
| CLOSED | Hidden, replaced by "This request is closed." and a link to start a new one |

`RESOLVED` keeps the composer on purpose: it is how a customer says "this isn't fixed", and after
P16 it becomes the reopen entry point.

Hiding rather than disabling follows `docs/UIUX_FRONTEND.md §1.2` — the impossible is absent, not
greyed out.

---

## 4. Author Attribution

Both audiences need to know who is speaking, and they need different words for it.

`lib/labels.ts` gains `commentAuthorLabel(author, audience, selfId)`:

| Author | Customer sees | Staff sees |
|---|---|---|
| Staff member | "Support" | The person's name |
| The viewing customer | "You" | The customer's name |
| Another customer | *(cannot occur — scope prevents it)* | The customer's name |

Customers see **"Support", not the agent's name.** `docs/UIUX_FRONTEND.md §4` maps `assignee` to
"Your support agent" for customers, and the ticket detail already surfaces that. Attaching a
staff name to every individual message exposes internal staffing patterns — who works weekends, who
handles escalations — with no benefit to the customer.

---

## 5. Thread Rendering

`components/comments/timeline.tsx` gains author identity and side-orientation.

- **Customer messages** align leading, on `surface` with a border.
- **Support replies** align leading with a subtle `structure`-tinted left border.
- **Internal notes** (staff view only) keep the existing subtle gold left-border and the "Internal
  note" label from `docs/UIUX_FRONTEND.md §5`.

No chat-bubble styling and no right-alignment. This is an operational tool, not a messenger; the
squared working surfaces from `§2.3` are the signature and a bubble UI would break it.

Every entry carries author label, relative timestamp with an absolute `title`, and — in the staff
view only — an audience tag. Ordering is oldest-first: this is a conversation, and the newest-first
ordering of the activity timeline is a different thing on the same page.

---

## 6. Staff View

`(staff)/tickets/[id]` needs no structural change; the regenerated type and the new attribution
carry it. Two additions:

- Customer replies get a **"From customer"** tag so an agent scanning a long thread can see at a
  glance where the last customer input was.
- The existing `comment-composer.tsx` audience toggle is untouched. Its distinct styling for internal
  notes is the thing that stops an agent posting a note to the customer, and this phase must not
  soften it.

---

## 7. Error Handling

Per `docs/UIUX_FRONTEND.md §8`, all rendered inline beneath the composer:

| Backend | Copy |
|---|---|
| 403 (customer attempted `INTERNAL_NOTE`) | Not reachable from the UI — the action hardcodes the type. If it occurs, generic 500 copy; it is a bug, not a user error. |
| 404 | "This request couldn't be found." |
| 422 (ticket closed) | "This request is closed and can't take new replies." |
| 401 | Redirect to sign-in |
| 500 / network | "Something went wrong on our end. Try again." + retry, text preserved |

---

## 8. Tests

`components/comments/reply-composer.test.tsx`
- Renders for OPEN/IN_PROGRESS/RESOLVED; absent for CLOSED.
- Empty submit blocked; over-length blocked with the character message.
- Text preserved on failure, cleared on success.

`components/comments/timeline.test.tsx`
- Customer variant renders "Support" for staff authors and "You" for self — and **never a staff
  name** (the attribution-leak regression).
- Customer variant renders no `INTERNAL_NOTE` entry and no "Internal note" string, even when one is
  passed in — the backend filters, but the component must not be the only thing standing between an
  internal note and a customer.
- Staff variant renders real names, audience tags, and the "From customer" tag.

`lib/labels.test.ts`
- `commentAuthorLabel` covers every author/audience/self combination.

---

## 9. Definition of Done

Types regenerated and every `author_id` reference resolved; a customer can reply on OPEN,
IN_PROGRESS, and RESOLVED but not CLOSED; customers never see a staff member's name or any trace of
an internal note; failed sends preserve the typed text; verified at mobile width.
