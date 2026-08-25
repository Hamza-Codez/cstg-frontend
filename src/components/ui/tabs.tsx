/**
 * URL-driven tabs (spec09 frontend §4).
 *
 * Links, not buttons with state. The panels are Server Components that fetch
 * with the session token, so a tab change is a navigation — which also makes
 * every tab shareable and back-button-correct for free.
 *
 * `role="tablist"` is deliberately *not* used: the ARIA tabs pattern promises
 * arrow-key navigation between panels in one document, and these are separate
 * page renders. A nav of links is what this actually is, so it is marked up as
 * one and screen readers get the truth.
 */

import Link from "next/link";

export interface TabItem {
  id: string;
  label: string;
  href: string;
}

export function Tabs({
  items,
  active,
  label,
}: {
  items: TabItem[];
  active: string;
  label: string;
}) {
  return (
    <nav aria-label={label} className="border-b border-border">
      <ul className="-mb-px flex gap-1">
        {items.map((item) => {
          const current = item.id === active;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={[
                  "inline-flex min-h-10 items-center border-b-2 px-3 text-sm transition-colors duration-fast",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  current
                    ? "border-structure font-medium text-text"
                    : "border-transparent text-text/60 hover:border-border hover:text-text",
                ].join(" ")}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
