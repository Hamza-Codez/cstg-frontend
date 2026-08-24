import { QueueView } from "@/components/tickets/queue-view";
import { loadQueue } from "@/lib/staff-queue";

export const metadata = { title: "Unassigned · Support Engine" };

export default async function UnassignedPage() {
  const { tickets, error } = await loadQueue({ assigned: false });
  return <QueueView title="Unassigned" tickets={tickets} empty="Everything has an owner. Nothing to triage." error={error} />;
}
