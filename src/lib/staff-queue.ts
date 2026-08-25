import "server-only";

import { listTickets, type TicketFilters } from "@/lib/api/tickets";
import { getSession } from "@/lib/auth/session";
import { byUrgency } from "@/lib/queue";
import type { TicketResponse } from "@/lib/types";

/**
 * Fetch a staff queue and order it most-urgent-first.
 *
 * Scope is decided by the backend from the caller's role (INV-9): an agent's
 * request returns only their assigned tickets without the UI asking for that.
 */
export async function loadQueue(
  filters: TicketFilters = {},
): Promise<{ tickets: TicketResponse[]; error?: string }> {
  const session = await getSession();
  if (!session) return { tickets: [], error: "Your session has expired. Sign in again." };

  const result = await listTickets(session.token, { limit: 100, ...filters });
  if (!result.ok) {
    return {
      tickets: [],
      // A 403 here means a filter this role may not use reached the API
      // (spec04 §4). The bar hides those controls, so seeing this is a UI bug
      // rather than something to explain away — it gets the plain §8 copy.
      error:
        result.error.code === "FORBIDDEN"
          ? "You don't have access to this."
          : "Something went wrong on our end. Try again.",
    };
  }
  return { tickets: byUrgency(result.data.items, Date.now()) };
}
