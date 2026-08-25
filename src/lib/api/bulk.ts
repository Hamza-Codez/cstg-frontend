import { apiFetch, type ApiResult } from "./client"
import type {
  BulkResult,
  BulkAssignmentRequest,
  BulkTransitionRequest,
  BulkReassignmentRequest,
} from "@/lib/types"

export function bulkAssign(
  token: string,
  request: BulkAssignmentRequest
): Promise<ApiResult<BulkResult>> {
  return apiFetch<BulkResult>("/api/v1/tickets/bulk/assignment", {
    method: "POST",
    token,
    body: request,
  })
}

export function bulkTransition(
  token: string,
  request: BulkTransitionRequest
): Promise<ApiResult<BulkResult>> {
  return apiFetch<BulkResult>("/api/v1/tickets/bulk/transitions", {
    method: "POST",
    token,
    body: request,
  })
}

export function bulkReassign(
  token: string,
  request: BulkReassignmentRequest
): Promise<ApiResult<BulkResult>> {
  return apiFetch<BulkResult>("/api/v1/tickets/bulk/reassignment", {
    method: "POST",
    token,
    body: request,
  })
}
