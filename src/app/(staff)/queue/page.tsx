import { QueueView } from "@/components/tickets/queue-view";
import { loadQueue } from "@/lib/staff-queue";

export const metadata = { title: "My queue · Support Engine" };

export default async function QueuePage() {
  const { tickets, error } = await loadQueue({});
  return <QueueView title="My queue" tickets={tickets} empty="Nothing assigned to you right now." error={error} />;
}
