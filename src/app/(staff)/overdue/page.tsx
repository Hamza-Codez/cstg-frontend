import { FilteredQueue } from "@/components/tickets/filtered-queue";

export const metadata = { title: "Overdue · Support Engine" };

export default async function OverduePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <FilteredQueue
      title="Overdue"
      empty="Nothing is overdue. The queue is healthy."
      searchParams={await searchParams}
      baseFilters={{ breached: true }}
    />
  );
}
