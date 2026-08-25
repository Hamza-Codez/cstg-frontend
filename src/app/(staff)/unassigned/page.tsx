import { FilteredQueue } from "@/components/tickets/filtered-queue";

export const metadata = { title: "Unassigned · Support Engine" };

export default async function UnassignedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <FilteredQueue
      title="Unassigned"
      empty="Everything has an owner. Nothing to triage."
      searchParams={await searchParams}
      baseFilters={{ assigned: false }}
      selectable={true}
    />
  );
}
