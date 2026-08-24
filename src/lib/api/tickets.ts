/** Typed ticket calls (docs/API.md §4, §7). */

import { apiFetch, type ApiResult } from "./client";
import type { TicketFilterValues } from "@/lib/filters";
import type {
  Category,
  CommentResponse,
  CommentType,
  PaginatedTicketResponse,
  TicketDetailResponse,
  TicketResponse,
  TicketStatus,
  UserSummary,
} from "@/lib/types";

/** Wire-level list params: the URL filters plus pagination. */
export interface TicketFilters extends TicketFilterValues {
  limit?: number;
  cursor?: string;
}

export function listTickets(
  token: string,
  filters: TicketFilters = {},
): Promise<ApiResult<PaginatedTicketResponse>> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const suffix = query.size > 0 ? `?${query}` : "";
  return apiFetch<PaginatedTicketResponse>(`/api/v1/tickets${suffix}`, { token });
}

export function transitionTicket(
  token: string,
  ticketId: string,
  to: TicketStatus,
): Promise<ApiResult<TicketResponse>> {
  return apiFetch<TicketResponse>(`/api/v1/tickets/${ticketId}/transitions`, {
    method: "POST",
    token,
    body: { to },
  });
}

export function assignTicket(
  token: string,
  ticketId: string,
  assigneeId: string,
): Promise<ApiResult<TicketResponse>> {
  return apiFetch<TicketResponse>(`/api/v1/tickets/${ticketId}/assignment`, {
    method: "POST",
    token,
    body: { assignee_id: assigneeId },
  });
}

export function addComment(
  token: string,
  ticketId: string,
  input: { type: CommentType; body: string },
): Promise<ApiResult<CommentResponse>> {
  return apiFetch<CommentResponse>(`/api/v1/tickets/${ticketId}/comments`, {
    method: "POST",
    token,
    body: input,
  });
}

/** Assignable staff for the dispatcher picker — active agents only (INV-8). */
export function listActiveAgents(token: string): Promise<ApiResult<{ items: UserSummary[] }>> {
  return apiFetch<{ items: UserSummary[] }>("/api/v1/users?role=AGENT&is_active=true", {
    token,
  });
}

export function getTicket(
  token: string,
  ticketId: string,
): Promise<ApiResult<TicketDetailResponse>> {
  return apiFetch<TicketDetailResponse>(`/api/v1/tickets/${ticketId}`, { token });
}

export function createTicket(
  token: string,
  input: { subject: string; body: string; category: Category },
): Promise<ApiResult<TicketResponse>> {
  return apiFetch<TicketResponse>("/api/v1/tickets", { method: "POST", token, body: input });
}

export function listComments(
  token: string,
  ticketId: string,
): Promise<ApiResult<{ items: CommentResponse[] }>> {
  return apiFetch<{ items: CommentResponse[] }>(`/api/v1/tickets/${ticketId}/comments`, { token });
}
