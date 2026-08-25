import { headers } from "next/headers";

import { isSameOrigin } from "@/lib/http/same-origin";

/**
 * CSRF guard for Server Actions (spec00 §5).
 *
 * Next 15 already validates Origin against Host for Server Actions; this is
 * defence in depth and the explicit statement of the rule.
 *
 * Compares the request's Origin against its OWN Host, exactly as the Route
 * Handler guard does. It previously compared against `FRONTEND_ORIGIN` and
 * threw when the two differed — which meant every mutation returned Internal
 * Server Error whenever `next dev` bound to a port other than the configured
 * one, or the variable was unset. A dev-only misconfiguration should never look
 * like a server fault.
 *
 * A genuine cross-origin POST still throws: that failure is correct, and loud.
 */
export async function assertSameOrigin(): Promise<void> {
  const reqHeaders = await headers();
  const claimed = reqHeaders.get("origin") ?? reqHeaders.get("referer");

  if (!isSameOrigin(claimed, reqHeaders.get("host"))) {
    throw new Error("Cross-origin mutation refused.");
  }
}
