"use client"

import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import type { BulkResult, TicketResponse } from "@/lib/types"

const ERROR_MESSAGES: Record<string, string> = {
  STATE_CONFLICT: "someone else updated this ticket",
  BUSINESS_RULE_VIOLATION: "this action violates a business rule",
  NOT_FOUND: "ticket not found",
  INTERNAL_ERROR: "internal server error",
}

export function BulkResultDialog({
  result,
  tickets,
  isOpen,
  onClose,
  onRetry,
}: {
  result: BulkResult | null
  tickets: { id: string; subject: string }[]
  isOpen: boolean
  onClose: () => void
  onRetry?: (failedIds: string[]) => void
}) {
  if (!result || !isOpen) return null

  const failedItems = result.results.filter((r) => !r.ok)
  if (failedItems.length === 0) return null

  const failedIds = failedItems.map(r => r.ticket_id)
  
  // Map tickets for quick lookup
  const ticketMap = new Map(tickets.map(t => [t.id, t.subject]))

  const displayedFailures = failedItems.slice(0, 10)
  const moreCount = failedItems.length - 10

  return (
    <Modal open={true} onClose={onClose} title="Action partially completed">
      <div className="flex flex-col">
        <div className="mb-4 flex items-center gap-2 font-medium text-text">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <span>{result.succeeded} of {result.requested} tickets processed successfully.</span>
        </div>
        <p className="mb-2 text-sm text-text font-medium">
          {failedItems.length} couldn&apos;t be processed:
        </p>
        <ul className="mb-4 space-y-2 text-sm text-text">
          {displayedFailures.map((item) => {
            const subject = ticketMap.get(item.ticket_id) || item.ticket_id
            const message = (item.error?.code && ERROR_MESSAGES[item.error.code]) 
              || item.error?.message 
              || "unknown error"
            return (
              <li key={item.ticket_id} className="flex gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-overdue" />
                <span>
                  <span className="italic">{message}</span> — {subject}
                </span>
              </li>
            )
          })}
          {moreCount > 0 && (
            <li className="pl-6 italic text-text/60">...and {moreCount} more</li>
          )}
        </ul>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Dismiss
        </Button>
        {onRetry && (
          <Button variant="primary" onClick={() => onRetry(failedIds)}>
            Retry failed
          </Button>
        )}
      </div>
    </Modal>
  )
}
