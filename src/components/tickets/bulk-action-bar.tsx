"use client"

import { useEffect, useState } from "react"
import { CheckCircle2 } from "lucide-react"

import { bulkAssignAction, bulkTransitionAction } from "@/app/actions/bulk"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { Modal } from "@/components/ui/modal"
import type { BulkResult, StaffRole, UserSummary } from "@/lib/types"

import { createPortal } from "react-dom"

export function BulkActionBar({
  selectedIds,
  role,
  agents,
  onClear,
  onResult,
}: {
  selectedIds: Set<string>
  role: StaffRole
  agents: UserSummary[]
  onClear: () => void
  onResult: (result: BulkResult) => void
}) {
  const count = selectedIds.size
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (count === 0) return null

  const content = (
    <div className="flex w-full items-center justify-between gap-4 rounded-sm border border-structure bg-canvas px-3 py-1.5 shadow-sm md:w-auto md:justify-end">
      <span className="whitespace-nowrap text-sm font-medium text-text">
        {count} selected
      </span>
      <div className="flex items-center gap-2">
        {(role === "DISPATCHER" || role === "ADMIN") && (
          <BulkAssignDialog
            selectedIds={selectedIds}
            agents={agents}
            onResult={onResult}
          />
        )}
        <BulkCloseDialog
          selectedIds={selectedIds}
          onResult={onResult}
        />
        <Button variant="ghost" onClick={onClear}>
          Cancel
        </Button>
      </div>
    </div>
  )

  const portalEl = mounted ? document.getElementById("bulk-action-portal-desktop") : null

  return (
    <>
      <div className={portalEl ? "md:hidden mb-4" : "mb-4"}>
        {content}
      </div>
      {portalEl && createPortal(content, portalEl)}
    </>
  )
}

function BulkAssignDialog({
  selectedIds,
  agents,
  onResult,
}: {
  selectedIds: Set<string>
  agents: UserSummary[]
  // No `onClear`: clearing the selection after a bulk action is the caller's
  // job through `onResult` — queue-view empties it on full success and keeps
  // only the failed ids otherwise, so a second path here would fight it.
  onResult: (result: BulkResult) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [chosen, setChosen] = useState<string | null>(null)

  const options = agents.map((agent) => ({
    value: agent.id,
    label: agent.name,
    hint:
      agent.max_open_tickets == null
        ? `${agent.open_ticket_count ?? 0} open`
        : `${agent.open_ticket_count ?? 0} / ${agent.max_open_tickets} open`,
    flagged: agent.max_open_tickets != null && (agent.open_ticket_count ?? 0) >= agent.max_open_tickets,
    flagLabel: "At limit",
  }))

  const handleAssign = async () => {
    if (!chosen) return
    setIsSubmitting(true)
    try {
      const res = await bulkAssignAction({
        ticket_ids: Array.from(selectedIds),
        assignee_id: chosen,
        override_capacity: false,
      })
      if (res.ok) {
        setIsOpen(false)
        onResult(res.data)
      } else {
        alert(res.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button variant="neutral" onClick={() => setIsOpen(true)}>
        Assign to...
      </Button>
      {isOpen && (
        <Modal open={true} onClose={() => setIsOpen(false)} title="Assign tickets">
          {agents.length === 0 ? (
            <p className="text-sm text-text/60">No active agents are available.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <Combobox
                label="Agent"
                options={options}
                value={chosen}
                onChange={setChosen}
                placeholder="Search agents..."
                emptyMessage="No agents match."
              />
              <div className="mt-4 flex gap-2">
                <Button variant="primary" onClick={handleAssign} disabled={isSubmitting || !chosen}>
                  {isSubmitting ? "Assigning..." : `Assign ${selectedIds.size} tickets`}
                </Button>
                <Button variant="ghost" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}

function BulkCloseDialog({
  selectedIds,
  onResult,
}: {
  selectedIds: Set<string>
  onResult: (result: BulkResult) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = async () => {
    setIsSubmitting(true)
    try {
      const res = await bulkTransitionAction({
        ticket_ids: Array.from(selectedIds),
        to: "CLOSED",
      })
      if (res.ok) {
        setIsOpen(false)
        onResult(res.data)
      } else {
        alert(res.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button variant="neutral" onClick={() => setIsOpen(true)}>
        <CheckCircle2 className="mr-2 h-4 w-4" /> Close
      </Button>
      {isOpen && (
        <Modal open={true} onClose={() => setIsOpen(false)} title="Close tickets">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text">
              Close {selectedIds.size} tickets? This can&apos;t be undone.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleClose} disabled={isSubmitting}>
                {isSubmitting ? "Closing..." : "Close Tickets"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
