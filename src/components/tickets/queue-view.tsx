import { Inbox } from "lucide-react";

import { TicketTable } from "@/components/tickets/ticket-table";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { TicketResponse } from "@/lib/types";

export function QueueView({
  title,
  tickets,
  empty,
  error,
}: {
  title: string;
  tickets: TicketResponse[];
  empty: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-medium">{title}</h1>
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
        <TicketTable tickets={tickets} caption={title} />
      )}
    </div>
  );
}
