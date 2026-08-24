"use client";

/**
 * Attachment upload (P14.7, spec03 §3).
 *
 * Uploads go to a Next Route Handler on this origin, never to the backend
 * (spec00 §4 D2).
 *
 * Progress uses XMLHttpRequest, the one place this app does not use `fetch`:
 * fetch cannot report upload progress, and a 10 MB upload on a phone with no
 * feedback reads as a frozen page.
 */

import { Paperclip, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { preflight, putFile } from "@/lib/upload/client-upload";

type ItemState = "queued" | "uploading" | "done" | "failed";

interface Item {
  id: string;
  file: File;
  state: ItemState;
  progress: number;
  error?: string;
}

export function AttachmentUpload({
  ticketId,
  onUploaded,
  disabled = false,
}: {
  ticketId: string;
  onUploaded?: () => void;
  disabled?: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function patch(id: string, next: Partial<Item>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...next } : item)));
  }

  async function enqueue(files: FileList | null) {
    if (!files || files.length === 0) return;

    const queued: Item[] = Array.from(files).map((file) => {
      const error = preflight(file);
      return {
        id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        file,
        state: error ? "failed" : "queued",
        progress: 0,
        error: error ?? undefined,
      };
    });
    setItems((current) => [...current, ...queued]);

    // Sequential, not parallel: concurrent uploads from a phone compete for the
    // same uplink and make every one of them slower and less legible.
    for (const item of queued) {
      if (item.state === "failed") continue;
      patch(item.id, { state: "uploading" });
      try {
        await putFile(ticketId, item.file, (pct) => patch(item.id, { progress: pct }));
        patch(item.id, { state: "done", progress: 100 });
        onUploaded?.();
      } catch (error) {
        // One failure never discards the others — the loop continues.
        patch(item.id, {
          state: "failed",
          error: error instanceof Error ? error.message : "Upload failed.",
        });
      }
    }
  }

  async function retry(item: Item) {
    patch(item.id, { state: "uploading", progress: 0, error: undefined });
    try {
      await putFile(ticketId, item.file, (pct) => patch(item.id, { progress: pct }));
      patch(item.id, { state: "done", progress: 100 });
      onUploaded?.();
    } catch (error) {
      patch(item.id, {
        state: "failed",
        error: error instanceof Error ? error.message : "Upload failed.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* A real <label> wrapping a hidden <input type="file">: focusable,
          Enter/Space activates it, and it announces correctly. A <div> with a
          click handler would do none of that. Drag-and-drop is enhancement on
          top — it is unusable by keyboard and absent on touch. */}
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) void enqueue(event.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed px-4 py-6 text-sm transition-colors",
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-accent",
          dragging ? "border-accent bg-accent/5" : "border-border bg-surface",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <Upload aria-hidden strokeWidth={1.5} className="size-4 text-structure" />
        <span className="text-text">
          <span className="font-medium">Choose files</span> or drag them here
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          disabled={disabled}
          className="sr-only"
          onChange={(event) => {
            void enqueue(event.target.files);
            event.target.value = "";
          }}
        />
      </label>

      {items.length > 0 && (
        <ul className="flex flex-col gap-1" aria-live="polite">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 text-sm"
            >
              <Paperclip aria-hidden strokeWidth={1.5} className="size-4 shrink-0 text-structure" />
              <span className="min-w-0 flex-1 truncate text-text">{item.file.name}</span>

              {item.state === "uploading" && (
                <span
                  role="progressbar"
                  aria-valuenow={item.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Uploading ${item.file.name}`}
                  className="text-xs text-text/60"
                >
                  {item.progress}%
                </span>
              )}
              {item.state === "done" && <span className="text-xs text-on-track">Attached</span>}
              {item.state === "queued" && <span className="text-xs text-text/60">Waiting</span>}
              {item.state === "failed" && (
                <>
                  <span className="text-xs text-overdue">{item.error}</span>
                  <button
                    type="button"
                    onClick={() => void retry(item)}
                    className="cursor-pointer text-xs text-structure underline"
                  >
                    Retry
                  </button>
                </>
              )}

              <button
                type="button"
                aria-label={`Remove ${item.file.name}`}
                onClick={() => setItems((c) => c.filter((i) => i.id !== item.id))}
                className="cursor-pointer text-text/40 hover:text-text"
              >
                <X aria-hidden strokeWidth={1.5} className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
