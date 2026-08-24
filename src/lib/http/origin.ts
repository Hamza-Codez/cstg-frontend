/**
 * Same-origin guard for Route Handlers (spec00 §5).
 *
 * Next 15 validates `Origin` against `Host` for **Server Actions**
 * automatically. It does **not** do this for Route Handlers — so every mutating
 * handler is CSRF-reachable unless it checks for itself.
 *
 * The predicate itself lives in `same-origin.ts`, which carries no framework
 * surface, because Server Actions import it too. Keeping the `Response`-building
 * helper out of that module is what stops route-handler code being dragged into
 * the RSC graph.
 *
 * Returns a `Response` to send, or `null` to continue. Deliberately not a throw:
 * a handler that forgets a try/catch would leak a 500 instead of refusing, and
 * `if (bad) return bad;` cannot be forgotten silently.
 */

import { isSameOrigin } from "@/lib/http/same-origin";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function sameOriginViolation(request: Request): Response | null {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return null;

  // Referer is the fallback: some privacy tooling strips Origin on same-origin
  // requests, and rejecting those would break the app for those users.
  const claimed = request.headers.get("origin") ?? request.headers.get("referer");
  return isSameOrigin(claimed, request.headers.get("host")) ? null : forbidden();
}

function forbidden(): Response {
  return Response.json(
    { error: { code: "FORBIDDEN", message: "Cross-origin request refused.", details: {} } },
    { status: 403 },
  );
}
