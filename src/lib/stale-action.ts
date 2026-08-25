/**
 * Stale Server Action detection.
 *
 * Next regenerates Server Action ids on every build, so a tab opened before a
 * rebuild or a deploy submits an id the server no longer knows and throws
 * "Server Action ... was not found". The page itself is fine — the tab is
 * simply stale — which is why the root error boundary treats this one case as
 * recoverable and reloads instead of showing a message.
 *
 * Extracted so the boundary and its test share one definition. It previously
 * lived inside `app/error.tsx` with the test carrying its own copy, which meant
 * the test could keep passing while the shipped predicate drifted away from it.
 */
export function isStaleActionMessage(message: string): boolean {
  return /server action/i.test(message) && /not\s*(be\s*)?found/i.test(message);
}

export function isStaleAction(error: Error): boolean {
  return isStaleActionMessage(error.message);
}
