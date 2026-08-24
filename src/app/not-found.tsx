import Link from "next/link";

/** Root 404 (docs/UIUX_FRONTEND.md §8) — same plain copy, always a way onward. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm text-text">This page couldn&apos;t be found.</p>
      <Link href="/" className="cursor-pointer text-sm text-structure hover:underline">
        Go to your home screen
      </Link>
    </div>
  );
}
