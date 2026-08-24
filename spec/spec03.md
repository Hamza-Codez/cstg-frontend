# spec03.md — F2 Attachments End-to-End (UI)

**Phase P14 · Wave 1 · Backend: `cstg-backend/spec/spec03.md`**

The backend has stored attachments since v1. The frontend has never referenced one — `grep -r
attachment src/` returns only the generated schema. Files exist in the database that no user can
reach.

---

## 1. Scope

| Surface | Change |
|---|---|
| `(portal)/requests/new` | Attach files while describing the problem |
| `(portal)/requests/[id]` | List and download; add a file afterwards |
| `(staff)/tickets/[id]` | List, download, upload |
| `components/attachments/` | New: `attachment-list.tsx`, `attachment-upload.tsx` |
| `lib/api/attachments.ts` | New typed module |
| `lib/format.ts` | `formatBytes` |

---

## 2. Upload Is Multipart — and Must Not Leave the Next Origin

Two constraints, and the second overrides the obvious design.

**Multipart cannot use `apiFetch`.** It sets `Content-Type: application/json` whenever a body is
present and `JSON.stringify`s it.

**The browser cannot call the backend.** `IMPLEMENTATION_V2.md §2B.3 D2`: the backend authenticates
on `Authorization: Bearer`, and the JWT lives in an httpOnly cookie only Next server code can read
(`session.ts` is `server-only`). A browser-issued request has no token to send. It would also be
cross-origin, and the backend has **no CORS middleware at all** — so it fails outright, not subtly.

So the upload goes **browser → Next route handler → backend**:

```
app/api/attachments/[ticketId]/route.ts   (POST)
  ├─ assertSameOrigin(request)        # CSRF — Next does NOT do this for route handlers
  ├─ getSession()                     # httpOnly cookie, server-side
  └─ stream the multipart body onward with the Bearer header
```

`apiUpload(path, formData, options)` in `lib/api/client.ts` targets **this handler**, not
`API_ORIGIN`. It sets no `Content-Type` — the browser must, because only it knows the multipart
boundary. Setting it by hand is the classic failure here, and the reason this is a separate function
rather than a flag on `apiFetch`.

Same `ApiResult<T>` return, so every call site handles failure identically.

**Progress still works.** XHR upload events measure the browser→Next hop, which is the one the user
experiences on a phone. The Next→backend hop is server-to-server and not what a progress bar is for.

The route handler **streams**; it must not buffer a 10 MB upload into the Node process.

---

## 3. Upload Component

`components/attachments/attachment-upload.tsx` — client component.

- Drop zone plus a visible "Choose files" button. Drag-and-drop is never the only path: it is
  unusable by keyboard and absent on touch.
- Client-side pre-checks mirroring the backend, for feedback only — size cap, content-type
  allow-list, per-ticket count. Rejections are stated with the actual limit ("Files must be 10 MB or
  smaller. `logs.zip` is 24 MB."), not a generic refusal.
- Per-file progress via `XMLHttpRequest` upload events. `fetch` cannot report upload progress, and a
  10 MB upload on a phone with no feedback reads as a frozen page. This is the one place the app does
  not use `fetch`, and it needs a comment saying why.
- Files upload **one at a time, sequentially**. Parallel uploads from a phone compete for the same
  uplink and make every one of them slower and less legible.
- Each file's row shows its own state: queued, uploading with progress, done, or failed with a
  retry. One failure never discards the others — the same partial-success posture as spec10.

### Accessibility

The drop zone is a `<label>` wrapping a visually-hidden `<input type="file">`, so it is focusable,
activates with Enter/Space, and announces properly — no `div` with a click handler. Drag events are
enhancement on top. Progress uses `role="progressbar"` with `aria-valuenow`; completion and failure
are announced through an `aria-live="polite"` region.

---

## 4. New Request Form

`components/forms/new-request-form.tsx` gains an attachment field — and a sequencing problem: the
ticket does not exist until it is created, so there is nothing to attach to.

**Create first, then upload, then navigate.**

1. Submit creates the ticket (existing action).
2. Queued files upload to the new ticket id.
3. Navigate to the detail page.

If the ticket is created but an upload fails, **navigate anyway** and surface the failure on the
detail page with a retry. The ticket is the valuable thing and it exists; blocking the user on the
detail page of a request they cannot see, or discarding a created ticket, are both worse. The toast
says so plainly: "Request sent. 1 file couldn't be attached — you can add it below."

---

## 5. Attachment List

`components/attachments/attachment-list.tsx` — Server Component; it only renders data.

Each row: file-type icon (`Paperclip` default), filename, `formatBytes(size)`, upload time, and a
download link. Rows are `rounded-sm`, aligned to the same column rhythm as the rest of the detail
panel (`docs/UIUX_FRONTEND.md §2.5`).

Download is a plain `<a>` to the backend endpoint with the bearer token — meaning it needs a route
handler, because the token is in an httpOnly cookie and cannot be attached to a bare link. Add
`app/(portal)/requests/[id]/attachments/[aid]/route.ts` and a staff equivalent: a Server Route
Handler that reads the session, calls the backend, and streams the response through. The token stays
server-side, which is the whole point of `session.ts` being `server-only`.

Streaming, not buffering: a 10 MB file must not be read into the Node process's memory to be handed
to the browser.

Empty state: "No files attached." plus the upload control — directional, per `§5`.

---

## 6. Labels

`lib/labels.ts` gains the `ATTACHMENT` event type for the activity timeline:

| Event | Customer | Staff |
|---|---|---|
| `ATTACHMENT` | *(not shown)* | "{actor} attached {filename}" |

Not shown to customers, matching the backend's decision to keep `ATTACHMENT` out of
`_CUSTOMER_VISIBLE_EVENTS`. Customers see their own files in the attachment list; staff uploads
appearing in their timeline would leak internal activity.

---

## 7. Error Handling

| Backend | Copy |
|---|---|
| 413 / 422 (too large) | "Files must be 10 MB or smaller." |
| 422 (type) | "That file type isn't supported." + the allowed list |
| 422 (count) | "This request already has the maximum of 20 files." |
| 422 (closed) | "This request is closed and can't take new files." |
| 404 | "This request couldn't be found." |
| 500 / network | "Something went wrong on our end. Try again." + retry on that file |

---

## 8. Tests

`components/attachments/attachment-upload.test.tsx`
- Oversized and disallowed-type files rejected client-side with the limit stated.
- One failed file among three leaves the other two successful and offers retry on the failure only.
- Keyboard: the label is focusable and Enter opens the picker.

`components/attachments/attachment-list.test.tsx`
- Renders size, name, and time; empty state renders with the CTA.
- Customer variant renders no uploader identity.

`lib/format.test.ts`
- `formatBytes` at 0, 999 B, exactly 1 KB, 1.5 MB, and the 10 MB cap.

---

## 9. Definition of Done

Upload works from the new-request form and both detail pages; a failed upload never costs the user
their ticket or the other files; downloads stream through a route handler with the token never
reaching the browser; the drop zone is fully keyboard-operable; verified at mobile width, where this
feature is most used.
