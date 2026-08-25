import { FilteredQueue } from "@/components/tickets/filtered-queue";

export const metadata = { title: "My queue · Support Engine" };

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <FilteredQueue
      title="My queue"
      empty="Nothing assigned to you right now."
      searchParams={await searchParams}
    />
  );
}
