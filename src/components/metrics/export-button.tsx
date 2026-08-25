"use client";

/**
 * CSV export trigger (spec09 frontend §5).
 *
 * A client component because it needs the *current* query string: the export
 * must match what is on screen, and the backend accepts the same filter set for
 * exactly that reason.
 *
 * It fetches rather than linking, for one reason: a plain `<a download>` gives
 * no way to catch the 422 over the row cap — the browser would navigate to a
 * page of error text. Fetching keeps the failure inside the app, where it can
 * be a sentence naming the limit and the fix.
 */

import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** Only the ticket filters travel; the dashboard's tab and preset do not. */
const FORWARDED = [
  "q",
  "status",
  "priority",
  "category",
  "breached",
  "assigned",
  "escalated",
  "tier",
  "assignee_id",
  "customer_id",
  "created_after",
  "created_before",
] as const;

export function ExportButton() {
  const searchParams = useSearchParams();
  const { show } = useToast();
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    try {
      const query = new URLSearchParams();
      for (const key of FORWARDED) {
        const value = searchParams.get(key);
        if (value) query.set(key, value);
      }

      const response = await fetch(`/api/export/tickets?${query}`, { cache: "no-store" });
      if (!response.ok) {
        // The route handler already writes the actionable copy, including the
        // row-cap sentence; surfacing its text keeps one source for that wording.
        show(await response.text(), "error");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ??
        "tickets.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      show("Couldn't prepare the export.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    // Secondary, not primary. `.bg-gradient-primary` is a translucent grey
    // written by hand in globals.css, and on the dashboard's pale canvas it
    // reads as a disabled control rather than a call to action.
    <Button variant="secondary" onClick={() => void run()} disabled={pending}>
      <Download aria-hidden className="size-4" strokeWidth={1.5} />
      {/* Streaming gives no progress, so the copy sets the expectation rather
          than implying a percentage that will never appear. */}
      {pending ? "Preparing your export…" : "Export CSV"}
    </Button>
  );
}
