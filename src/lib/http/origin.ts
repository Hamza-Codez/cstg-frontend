/**
 * Same-origin guard for Route Handlers (spec00 §5).
 *
 * Next 15 validates `Origin` against `Host` for **Server Actions**
 * automatically. It does **not** do this for Route Handlers — so every mutating
 * handler is CSRF-reachable unless it checks for itself.
 *
 * Distinct from `lib/auth/csrf.ts`, which guards Server Actions: that one reads
 * ambient `headers()` and compares against `APP_FRONTEND_ORIGIN`. A Route
 * Handler is handed the `Request`, and comparing against the request's *own*
 * host needs no configuration — so it keeps working on Vercel preview URLs,
 * where the deployment origin is not known at build time.
 *
 * Returns a `Response` to send, or `null` to continue. Deliberately not a throw:
 * a handler that forgets a try/catch would leak a 500 instead of refusing, and
 * `if (bad) return bad;` cannot be forgotten silently.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function sameOriginViolation(request: Request): Response | null {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return null;

  const host = request.headers.get("host");
  if (!host) return forbidden();

  // Referer is the fallback: some privacy tooling strips Origin on same-origin
  // requests, and rejecting those would break the app for those users.
  const claimed = request.headers.get("origin") ?? request.headers.get("referer");
  if (!claimed) return forbidden();

  let claimedHost: string;
  try {
    claimedHost = new URL(claimed).host;
  } catch {
    return forbidden();
  }

  return claimedHost === host ? null : forbidden();
}

function forbidden(): Response {
  return Response.json(
    { error: { code: "FORBIDDEN", message: "Cross-origin request refused.", details: {} } },
    { status: 403 },
  );
}
