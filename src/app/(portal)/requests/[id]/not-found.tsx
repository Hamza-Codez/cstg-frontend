import Link from "next/link";

/** Same copy for absent and hidden (docs/UIUX_FRONTEND.md §8). */
export default function RequestNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-sm text-text">This request couldn&apos;t be found.</p>
      <Link href="/requests" className="cursor-pointer text-sm text-structure hover:underline">
        Back to my requests
      </Link>
    </div>
  );
}
