"use client"

import { useState } from "react"
import { CheckCircle2, RefreshCw, Users } from "lucide-react"

import { bulkAssignAction, bulkTransitionAction } from "@/app/actions/bulk"
import { Button } from "@/components/ui/button"
import { Card, CardBody } from "@/components/ui/card"
import { Combobox } from "@/components/ui/combobox"
import { Modal } from "@/components/ui/modal"
import type { BulkResult, StaffRole, UserSummary } from "@/lib/types"

export function BulkActionBar({
  selectedIds,
  tickets,
  role,
  agents,
  onClear,
  onResult,
}: {
  selectedIds: Set<string>
  tickets: { id: string; subject: string }[]
  role: StaffRole
  agents: UserSummary[]
  onClear: () => void
  onResult: (result: BulkResult) => void
}) {
  const count = selectedIds.size

  if (count === 0) return null

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50/50">
      <CardBody className="flex items-center justify-between py-2">
        <span className="text-sm font-medium text-blue-900">
          {count} selected on this page.
        </span>
        <div className="flex items-center gap-2">
          {(role === "DISPATCHER" || role === "ADMIN") && (
            <BulkAssignDialog
              selectedIds={selectedIds}
              agents={agents}
              onClear={onClear}
              onResult={onResult}
            />
          )}
          <BulkCloseDialog
            selectedIds={selectedIds}
            onClear={onClear}
            onResult={onResult}
          />
          <Button variant="ghost" onClick={onClear}>
            Cancel
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

function BulkAssignDialog({
  selectedIds,
  agents,
  onClear,
  onResult,
}: {
  selectedIds: Set<string>
  agents: UserSummary[]
  onClear: () => void
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
  onClear,
  onResult,
}: {
  selectedIds: Set<string>
  onClear: () => void
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
