import { FilteredQueue } from "@/components/tickets/filtered-queue";

export const metadata = { title: "All tickets · Support Engine" };

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <FilteredQueue
      title="All tickets"
      empty="No tickets match this view."
      searchParams={await searchParams}
    />
  );
}
