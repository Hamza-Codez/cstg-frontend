"use client";

/**
 * New request (docs/UIUX_FRONTEND.md §7.1.3): one screen — subject, category,
 * description. Priority is never shown; the system derives it silently from the
 * customer's plan and category (SLA_ENGINE.md §2).
 */

import { Paperclip, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { createRequestAction, type NewRequestState } from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ACTIONS } from "@/lib/labels";
import { formatBytes } from "@/lib/format";
import { preflight, putFile } from "@/lib/upload/client-upload";
import type { Category } from "@/lib/types";

/** Plain choices with a one-line description, not enum names (§4, §7.1.3). */
const CATEGORIES: Array<{ value: Category; label: string; hint: string }> = [
  { value: "OUTAGE", label: "Service is down", hint: "Nothing loads, or the service is unavailable." },
  { value: "BILLING", label: "Billing", hint: "Invoices, payments, or your plan." },
  { value: "TECHNICAL", label: "Technical", hint: "Something is broken or behaving oddly." },
  { value: "GENERAL", label: "General", hint: "Anything else." },
];

export function NewRequestForm() {
  const [state, formAction, pending] = useActionState<NewRequestState, FormData>(
    createRequestAction,
    {},
  );
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const handled = useRef(false);

  /**
   * Create first, then upload, then navigate (spec03 §4).
   *
   * If an upload fails we navigate **anyway**: the ticket is the valuable thing
   * and it already exists. Blocking the customer on a page for a request they
   * cannot see — or discarding a created ticket — are both worse outcomes than
   * one missing file they can re-add on the detail screen.
   */
  useEffect(() => {
    if (!state.ticketId || handled.current) return;
    handled.current = true;

    const ticketId = state.ticketId;
    if (files.length === 0) {
      router.push(`/requests/${ticketId}`);
      return;
    }

    void (async () => {
      setUploading(true);
      let failures = 0;
      for (const file of files) {
        try {
          await putFile(ticketId, file);
        } catch {
          failures += 1;
        }
      }
      const query = failures > 0 ? `?attachmentsFailed=${failures}` : "";
      router.push(`/requests/${ticketId}${query}`);
    })();
  }, [state.ticketId, files, router]);

  function addFiles(picked: FileList | null) {
    if (!picked) return;
    const accepted: File[] = [];
    const errors: string[] = [];
    for (const file of Array.from(picked)) {
      const problem = preflight(file);
      if (problem) errors.push(problem);
      else accepted.push(file);
    }
    setFiles((current) => [...current, ...accepted]);
    setRejected(errors);
  }

  const busy = pending || uploading;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Input
        label="Subject"
        name="subject"
        required
        maxLength={200}
        hint="A short title, for example “Cannot sign in”."
        error={state.fieldErrors?.subject}
      />

      <Field label="What is this about?" htmlFor="category" required>
        <div className="flex flex-col gap-2">
          {CATEGORIES.map((option, index) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface px-3 py-2"
            >
              <input
                type="radio"
                name="category"
                value={option.value}
                defaultChecked={index === CATEGORIES.length - 1}
                className="mt-1 cursor-pointer accent-accent"
              />
              <span className="flex flex-col">
                <span className="text-sm text-text">{option.label}</span>
                <span className="text-xs text-text/60">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </Field>

      <Field
        label="Description"
        htmlFor="body"
        required
        error={state.fieldErrors?.body}
        hint="What happened, and what you expected instead."
      >
        <textarea
          id="body"
          name="body"
          required
          rows={6}
          maxLength={10000}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        />
      </Field>

      <Field label="Attachments" htmlFor="attachments" hint="Optional. Screenshots or logs help.">
        {/* A real <label> around a hidden input: focusable, Enter/Space works,
            and it announces properly. Files are held here and uploaded after
            the ticket exists. */}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-border bg-surface px-3 py-4 text-sm focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-accent">
          <Paperclip aria-hidden strokeWidth={1.5} className="size-4 text-structure" />
          <span className="text-text">Choose files</span>
          <input
            id="attachments"
            type="file"
            multiple
            className="sr-only"
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>

        {files.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-text">{file.name}</span>
                <span className="shrink-0 text-xs text-text/60">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => setFiles((c) => c.filter((_, i) => i !== index))}
                  className="cursor-pointer text-text/40 hover:text-text"
                >
                  <X aria-hidden strokeWidth={1.5} className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {rejected.map((message) => (
          <p key={message} role="alert" className="mt-1 text-xs text-overdue">
            {message}
          </p>
        ))}
      </Field>

      {state.error && (
        <p role="alert" className="text-xs text-overdue">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="primary" block disabled={busy}>
        {uploading ? "Attaching files…" : pending ? "Sending…" : ACTIONS.send}
      </Button>
    </form>
  );
}
