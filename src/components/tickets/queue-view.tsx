"use client"

import { useState, useEffect } from "react"
import { Inbox } from "lucide-react"

import { TicketTable } from "@/components/tickets/ticket-table"
import { BulkActionBar } from "@/components/tickets/bulk-action-bar"
import { BulkResultDialog } from "@/components/tickets/bulk-result-dialog"
import { Card, CardBody } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { useToast } from "@/components/ui/toast"
import type { TicketResponse, StaffRole, UserSummary, BulkResult } from "@/lib/types"

export function QueueView({
  title,
  tickets,
  empty,
  error,
  role,
  agents = [],
  selectable = false,
}: {
  title: string
  tickets: TicketResponse[]
  empty: string
  error?: string
  role?: StaffRole
  agents?: UserSummary[]
  selectable?: boolean
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null)
  const [isResultOpen, setIsResultOpen] = useState(false)
  const { show } = useToast()

  // Clear selection if the tickets completely change (e.g., search params changed)
  // Actually, we clear only the tickets that are no longer in the list.
  useEffect(() => {
    setSelectedIds((prev) => {
      const currentIds = new Set(tickets.map((t) => t.id))
      const next = new Set<string>()
      for (const id of prev) {
        if (currentIds.has(id)) next.add(id)
      }
      return next
    })
  }, [tickets])

  const handleBulkResult = (result: BulkResult) => {
    const failed = result.results.filter((r) => !r.ok)
    if (failed.length === 0) {
      show(`${result.succeeded} tickets processed successfully.`)
      setSelectedIds(new Set())
    } else {
      setBulkResult(result)
      setIsResultOpen(true)
      // Keep only failed ids in selection
      const failedIds = new Set(failed.map((r) => r.ticket_id))
      setSelectedIds((prev) => {
        const next = new Set<string>()
        for (const id of prev) {
          if (failedIds.has(id)) next.add(id)
        }
        return next
      })
    }
  }

  const handleRetryFailed = (failedIds: string[]) => {
    setIsResultOpen(false)
    setSelectedIds(new Set(failedIds))
  }

  return (
    <div className="flex flex-col gap-4">
      {selectable && role && (
        <>
          <BulkActionBar
            selectedIds={selectedIds}
            tickets={tickets}
            role={role}
            agents={agents}
            onClear={() => setSelectedIds(new Set())}
            onResult={handleBulkResult}
          />
          <BulkResultDialog
            result={bulkResult}
            tickets={tickets}
            isOpen={isResultOpen}
            onClose={() => setIsResultOpen(false)}
            onRetry={handleRetryFailed}
          />
        </>
      )}

      {error ? (
        <Card>
          <CardBody>
            <p className="text-sm text-overdue">{error}</p>
          </CardBody>
        </Card>
      ) : tickets.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState icon={Inbox} message={empty} />
          </CardBody>
        </Card>
      ) : (
        <TicketTable
          tickets={tickets}
          caption={title}
          selectable={selectable}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
        />
      )}
    </div>
  )
}
