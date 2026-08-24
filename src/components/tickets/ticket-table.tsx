/**
 * Staff ticket table (docs/UIUX_FRONTEND.md §5).
 *
 * Blue header, white rows, whole row is a cursor-pointer link to detail.
 * Default order is most-urgent-first (§7.2.1).
 */

import Link from "next/link";

import { SlaCountdown } from "@/components/sla/sla-countdown";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { StatusBadge } from "@/components/tickets/status-badge";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/ui/table";
import type { TicketResponse } from "@/lib/types";

export function TicketTable({
  tickets,
  caption,
}: {
  tickets: TicketResponse[];
  caption: string;
}) {
  return (
    <Table caption={caption}>
      <TableHead>
        <Th>Subject</Th>
        <Th>Status</Th>
        <Th>Priority</Th>
        <Th>SLA</Th>
      </TableHead>
      <TableBody>
        {tickets.map((ticket) => {
          const settled = ticket.status === "RESOLVED" || ticket.status === "CLOSED";
          return (
            <Tr key={ticket.id}>
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
                  deadline={ticket.deadline}
                  createdAt={ticket.created_at}
                  audience="staff"
                  settled={settled}
                />
              </Td>
            </Tr>
          );
        })}
      </TableBody>
    </Table>
  );
}
