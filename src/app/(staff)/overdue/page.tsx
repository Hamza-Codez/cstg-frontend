import { QueueView } from "@/components/tickets/queue-view";
import { loadQueue } from "@/lib/staff-queue";

export const metadata = { title: "Overdue · Support Engine" };

export default async function OverduePage() {
  const { tickets, error } = await loadQueue({ breached: true });
  return <QueueView title="Overdue" tickets={tickets} empty="Nothing is overdue. The queue is healthy." error={error} />;
}
