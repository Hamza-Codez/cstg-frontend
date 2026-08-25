/**
 * The same-origin predicate, and nothing else.
 *
 * Deliberately its own module with zero framework surface: it is imported from
 * both the RSC graph (Server Actions, via lib/auth/csrf) and Route Handlers.
 * When this logic lived alongside the handler helper — which constructs
 * `Response` objects — importing it from a Server Action pulled route-handler
 * surface into the RSC module graph and Next failed to resolve it at runtime
 * (`__webpack_modules__[moduleId] is not a function`, taking every page that
 * reaches a Server Action with it).
 *
 * Compares against the request's OWN host rather than a configured origin, so
 * it needs no environment variable and cannot go stale: it works on whatever
 * port `next dev` actually bound to, and on Vercel preview URLs, whose origin is
 * not known at build time.
 *
 * `APP_FRONTEND_ORIGIN`, when set, is accepted as an ADDITIONAL allowed origin
 * for deployments behind a proxy that rewrites Host. It is never *required* —
 * requiring it is what turned a missing or mismatched value into a 500 on every
 * mutation.
 */
export function isSameOrigin(claimed: string | null, host: string | null): boolean {
  if (!claimed || !host) return false;

  let claimedHost: string;
  try {
    claimedHost = new URL(claimed).host;
  } catch {
    return false;
  }
  if (claimedHost === host) return true;

  const configured = process.env.APP_FRONTEND_ORIGIN;
  if (!configured) return false;
  try {
    return claimedHost === new URL(configured).host;
  } catch {
    return false;
  }
}
