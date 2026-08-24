/**
 * Route gating for UX (docs/FRONTEND_STRUCTURE.md §4).
 *
 * Never a security boundary: it exists so a user does not click into a screen
 * that will only 403. The backend remains authoritative.
 */

import { navFor } from "@/config/nav";
import type { Role } from "@/lib/types";

export function canAccess(role: Role, pathname: string): boolean {
  return navFor(role).some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
