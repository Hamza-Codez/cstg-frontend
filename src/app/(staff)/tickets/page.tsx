import { QueueView } from "@/components/tickets/queue-view";
import { loadQueue } from "@/lib/staff-queue";

export const metadata = { title: "All tickets · Support Engine" };

export default async function TicketsPage() {
  const { tickets, error } = await loadQueue({});
  return <QueueView title="All tickets" tickets={tickets} empty="No tickets match this view." error={error} />;
}
