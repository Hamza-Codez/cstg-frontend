/** Typed saved-view calls (docs/API.md §13). Server-side only. */

import { apiFetch, type ApiResult } from "./client";
import type { TicketFilterValues } from "@/lib/filters";

export interface SavedView {
  id: string;
  name: string;
  filters: TicketFilterValues;
  created_at: string;
}

export function listSavedViews(token: string): Promise<ApiResult<{ items: SavedView[] }>> {
  return apiFetch<{ items: SavedView[] }>("/api/v1/saved-views", { token });
}

export function createSavedView(
  token: string,
  body: { name: string; filters: TicketFilterValues },
): Promise<ApiResult<SavedView>> {
  return apiFetch<SavedView>("/api/v1/saved-views", { method: "POST", token, body });
}

export function deleteSavedView(token: string, id: string): Promise<ApiResult<void>> {
  return apiFetch<void>(`/api/v1/saved-views/${id}`, { method: "DELETE", token });
}
