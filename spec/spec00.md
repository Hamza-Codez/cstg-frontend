# spec00.md — F0 Deployment Foundations (Frontend)

**Phase 0B · blocking · Source: `rules.md` §1, §4, §5**

Numbered `00` because it runs *before* P13. This is the phase that decides how the browser reaches
the API — a decision P14, P19, and P20 all build route handlers on top of, and one that changes
P14's upload design outright.

Backend counterpart: `cstg-backend/spec/spec00.md`.

---

## 1. The Problem

`rules.md §1` requires the proxy pattern. This app has none: `next.config.ts` is
`{ reactStrictMode: true }` and nothing else, and `.env.local.example` sets
`NEXT_PUBLIC_API_URL=http://localhost:8000` — pointing the **browser** at the backend, the exact
anti-pattern the rule names.

Nothing breaks today only because every fetch is server-side. There is **no CORS middleware in the
backend at all**, so the first browser-originated request fails. P14 as originally specced introduced
exactly that.

---

## 2. The Proxy

```ts
// next.config.ts
async rewrites() {
  return [{
    source: "/api/v1/:path*",
    destination: `${process.env.API_ORIGIN}/api/v1/:path*`,
  }];
}
```

**`/api/v1/:path*`, not `/api/:path*`** (`IMPLEMENTATION_V2.md §2B.3 D1`). The backend mounts
everything under `/api/v1`, and Next's own route handlers live under `app/api/` — notifications
(P19), export (P20), attachments (P14). A blanket `/api/*` rewrite overlaps them.

A plain array from `rewrites()` behaves as `afterFiles`, so filesystem routes *currently* win and the
overlap resolves in our favour. That is an implicit dependency on Next's matching order which a later
switch to `beforeFiles` would break silently, in production, on routes that carry sessions. Matching
the backend's real prefix removes the overlap instead of surviving it.

The build **fails loudly** if `API_ORIGIN` is unset while `NODE_ENV=production`. A missing origin
must not degrade into a rewrite pointing at `undefined/api/v1/...`, whose symptom is `rules.md §6`
row 1 — login returning HTML.

---

## 3. Environment

| Variable | Scope | Notes |
|---|---|---|
| `API_ORIGIN` | **server only** | Read by `next.config.ts` at **build time**. Changing it in the Vercel dashboard does nothing until a redeploy |
| ~~`NEXT_PUBLIC_API_URL`~~ | — | **Deleted from the example file and the codebase.** Any `NEXT_PUBLIC_` API variable restores direct browser→backend calls and undoes the same-origin design |

`lib/api/client.ts` branches on execution context:

```ts
const BASE = typeof window === "undefined"
  ? process.env.API_ORIGIN ?? "http://localhost:8000"  // server: direct, absolute
  : "";                                                 // browser: relative, via the rewrite
```

Server-side fetches must use an absolute URL — a relative one has no origin to resolve against in
Node. Browser-side fetches must be relative, or they are cross-origin again.

`grep -rn "NEXT_PUBLIC_API" src/` returning empty is the acceptance check, and it belongs in review.

---

## 4. What the Browser May Call

**D2, and it governs every later phase:** the browser never calls the backend for an authenticated
request, proxy or not.

The backend authenticates on `Authorization: Bearer`. The JWT lives in an httpOnly cookie that only
server code can read — `lib/auth/session.ts` is `import "server-only"`, deliberately, to keep the
token out of the bundle. The proxy forwards cookies, but the backend does not read cookies, so a
browser-direct call would be anonymous even when it reaches the API.

| Traffic | Path |
|---|---|
| Authenticated reads | Server Component → `lib/api/*` → backend (Bearer) |
| Authenticated mutations | Server Action → `lib/api/*` → backend (Bearer) |
| Client-side polling, uploads, downloads | Browser → **Next route handler** → backend (Bearer) |
| Unauthenticated health checks | Browser → proxy → backend |

This satisfies `rules.md §1`'s intent — no cross-origin browser requests, no preflight, cookies
attach automatically — while keeping the XSS containment the existing design bought.

### Route handler conventions

Every handler under `app/api/` that fronts the backend:

1. `assertSameOrigin(request)` **if it mutates** (§5).
2. `getSession()`; no session → 401, never a redirect (these are fetched by script, not navigated to).
3. Attach the Bearer header server-side.
4. **Stream** binary bodies both ways — never buffer an upload or a 50 000-row export into the Node
   process.
5. Return the backend's error envelope unchanged so `client.ts` parses it exactly as elsewhere.

---

## 5. CSRF (`rules.md §4`)

`rules.md` specifies a non-HttpOnly `csrf_token` cookie for double-submit checks. That pattern
protects a **cookie-authenticated backend**. Under §4 the backend is bearer-authenticated and the
session cookie never leaves the Next origin, so there is nothing at the backend for double-submit to
protect (`IMPLEMENTATION_V2.md §2B.3 D3`).

The exposure that *is* real, and would otherwise be missed:

> Next 15 validates `Origin` against `Host` for **Server Actions** automatically. It does **not** do
> this for **Route Handlers**.

Every mutating route handler this program adds — P14 upload, P19 mark-read — would be CSRF-reachable
without an explicit check. So:

```ts
// lib/http/origin.ts
export function assertSameOrigin(request: Request): void
```

Compares `Origin` (falling back to `Referer`) against the request host; mismatch or absence on a
mutating method → **403**. Applied to every mutating handler, verified by a test per handler.

Third control: session cookies are `SameSite=Lax`, which blocks cross-site form posts.

---

## 6. Cookies (`rules.md §4`)

`session.ts::setSession` currently derives `secure` from `process.env.NODE_ENV === "production"`.
That conflates *build mode* with *deployment environment* — a production build run over http locally
silently sets `Secure` and the session is dropped, which is `rules.md §6` row 2 and reads as "login
returns 200 but you stay logged out".

Take it from configuration instead: `COOKIE_SECURE` — false in development, true in production, set
explicitly. `SameSite=Lax` and `path=/` are already correct and stay.

---

## 7. Submit Locks (`rules.md §5`) — already compliant

Audited: all eight forms pass `disabled={pending}` from `useActionState`, and `ui/button.tsx`
carries `disabled:cursor-not-allowed disabled:opacity-50`.

`assign-dialog` · `new-request-form` · `priority-matrix` · `sign-in-form` · `sign-up-form` ·
`staff-form` (both) · `action-panel`

**No work required.** Recorded so it is not "fixed" again, and so every form added in P13–P21
inherits the requirement: a submit control without a pending guard does not pass review.

---

## 8. Tests

`lib/http/origin.test.ts`
- Same origin → passes. Cross origin → 403. Missing `Origin` with `Referer` present → falls back.
  Missing both on a mutating method → 403. GET is exempt.

`lib/api/client.test.ts`
- Base URL is absolute in a server context and empty in a browser context (`typeof window` mocked
  both ways).
- No `NEXT_PUBLIC_` variable is read anywhere in the module.

Build-level
- `npm run build` fails when `API_ORIGIN` is unset with `NODE_ENV=production`.
- `grep -rn "NEXT_PUBLIC_API" src/` is empty — wired as a lint or CI step, not a manual habit.

---

## 9. Definition of Done

The rewrite serves `/api/v1/health` as JSON, not HTML; no `NEXT_PUBLIC_API*` remains anywhere; the
client base URL branches correctly by context; `assertSameOrigin` exists and is applied to every
mutating route handler added from P14 onward; cookie flags come from configuration rather than
`NODE_ENV`; the submit-lock audit is recorded as compliant.
