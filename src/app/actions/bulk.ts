"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth/session"
import { bulkAssign, bulkTransition, bulkReassign } from "@/lib/api/bulk"
import type {
  BulkAssignmentRequest,
  BulkTransitionRequest,
  BulkReassignmentRequest,
  BulkResult,
} from "@/lib/types"

export type BulkActionResponse =
  | { ok: true; data: BulkResult }
  | { ok: false; error: string }

export async function bulkAssignAction(
  request: BulkAssignmentRequest
): Promise<BulkActionResponse> {
  const session = await getSession()
  if (!session) return { ok: false, error: "Your session has expired. Sign in again." }

  const result = await bulkAssign(session.token, request)
  if (!result.ok) {
    return { ok: false, error: result.error?.message || "Failed to bulk assign tickets" }
  }

  // If there's any success, we revalidate the queue paths
  if (result.data.succeeded > 0) {
    revalidatePath("/")
  }
  return { ok: true, data: result.data }
}

export async function bulkTransitionAction(
  request: BulkTransitionRequest
): Promise<BulkActionResponse> {
  const session = await getSession()
  if (!session) return { ok: false, error: "Your session has expired. Sign in again." }

  const result = await bulkTransition(session.token, request)
  if (!result.ok) {
    return { ok: false, error: result.error?.message || "Failed to bulk transition tickets" }
  }

  if (result.data.succeeded > 0) {
    revalidatePath("/")
  }
  return { ok: true, data: result.data }
}

export async function bulkReassignAction(
  request: BulkReassignmentRequest
): Promise<BulkActionResponse> {
  const session = await getSession()
  if (!session) return { ok: false, error: "Your session has expired. Sign in again." }

  const result = await bulkReassign(session.token, request)
  if (!result.ok) {
    return { ok: false, error: result.error?.message || "Failed to bulk reassign tickets" }
  }

  if (result.data.succeeded > 0) {
    revalidatePath("/")
  }
  return { ok: true, data: result.data }
}
