/**
 * Staff ticket table (docs/UIUX_FRONTEND.md §5).
 *
 * Blue header, white rows, whole row is a cursor-pointer link to detail.
 * Default order is most-urgent-first (§7.2.1).
 */

import Link from "next/link";
import * as React from "react";

import { SlaCountdown } from "@/components/sla/sla-countdown";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { StatusBadge } from "@/components/tickets/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/ui/table";
import type { TicketResponse } from "@/lib/types";

export function TicketTable({
  tickets,
  caption,
  selectable = false,
  selectedIds = new Set(),
  onSelectChange,
}: {
  tickets: TicketResponse[];
  caption: string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectChange?: (ids: Set<string>) => void;
}) {
  const allSelected = tickets.length > 0 && tickets.every(t => selectedIds.has(t.id));
  const someSelected = tickets.length > 0 && tickets.some(t => selectedIds.has(t.id)) && !allSelected;

  const handleSelectAll = () => {
    if (!onSelectChange) return;
    if (allSelected) {
      onSelectChange(new Set());
    } else {
      const newSet = new Set(selectedIds);
      tickets.forEach(t => newSet.add(t.id));
      onSelectChange(newSet);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (!onSelectChange) return;
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    onSelectChange(newSet);
  };

  return (
    <Table caption={caption}>
      <TableHead>
        {selectable && (
          <Th className="w-12">
            <Checkbox
              aria-label="Select all tickets on this page"
              checked={allSelected}
              indeterminate={someSelected}
              onChange={handleSelectAll}
            />
          </Th>
        )}
        <Th>Subject</Th>
        <Th>Status</Th>
        <Th>Priority</Th>
        <Th>SLA</Th>
        <Th>Action</Th>
      </TableHead>
      <TableBody>
        {tickets.map((ticket) => {
          const settled = ticket.status === "RESOLVED" || ticket.status === "CLOSED";
          return (
            <Tr key={ticket.id}>
              {selectable && (
                <Td>
                  <Checkbox
                    aria-label={`Select ticket ${ticket.subject}`}
                    checked={selectedIds.has(ticket.id)}
                    onChange={(e) => handleSelectOne(ticket.id, e.target.checked)}
                  />
                </Td>
              )}
              <Td>
                {/* The link carries the row: keyboard users get one tab stop
                    that actually navigates, not a click handler on a <tr>. */}
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="cursor-pointer text-text hover:text-structure hover:underline"
                >
                  {ticket.subject}
                </Link>
              </Td>
              <Td>
                <StatusBadge
                  status={ticket.status}
                  audience="staff"
                  breached={ticket.sla_breached_at !== null && !settled}
                />
              </Td>
              <Td>
                <PriorityBadge priority={ticket.priority} />
              </Td>
              <Td>
                <SlaCountdown
                  dueAt={ticket.sla_due_at}
                  status={ticket.status}
                  createdAt={ticket.created_at}
                  audience="staff"
                  settled={settled}
                />
              </Td>
              <Td>
                <Link
                  href={`/tickets/${ticket.id}`}
                  className={buttonVariants({ variant: "neutral", className: "text-sm" })}
                >
                  View
                </Link>
              </Td>
            </Tr>
          );
        })}
      </TableBody>
    </Table>
  );
}
