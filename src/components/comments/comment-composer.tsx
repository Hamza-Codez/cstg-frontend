"use client";

/**
 * Comment composer (docs/UIUX_FRONTEND.md §5).
 *
 * A segmented toggle makes the audience explicit before typing, because the cost
 * of confusing the two is high: an internal note sent as a reply is visible to
 * the customer and cannot be unsent (the audit log is append-only).
 */

import { MessageSquare, StickyNote } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { commentAction, type ActionState } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { ACTIONS } from "@/lib/labels";
import type { CommentType } from "@/lib/types";

export function CommentComposer({ ticketId }: { ticketId: string }) {
  const [type, setType] = useState<CommentType>("PUBLIC_REPLY");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(commentAction, {});
  const { show } = useToast();

  useEffect(() => {
    if (state.error) show(state.error, "error");
    if (state.ok) show(type === "PUBLIC_REPLY" ? "Reply sent" : "Note added");
  }, [state, show, type]);

  const internal = type === "INTERNAL_NOTE";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <input type="hidden" name="type" value={type} />

      <div role="group" aria-label="Who sees this" className="flex gap-2">
        <ToggleButton
          active={!internal}
          onClick={() => setType("PUBLIC_REPLY")}
          icon={<MessageSquare aria-hidden className="size-4" strokeWidth={1.5} />}
          label="Reply to customer"
        />
        <ToggleButton
          active={internal}
          onClick={() => setType("INTERNAL_NOTE")}
          icon={<StickyNote aria-hidden className="size-4" strokeWidth={1.5} />}
          label="Internal note"
        />
      </div>

      <textarea
        name="body"
        required
        rows={4}
        aria-label={internal ? "Internal note" : "Reply to customer"}
        placeholder={
          internal ? "Only staff will see this." : "The customer will see this reply."
        }
        className={cn(
          "rounded-md border bg-surface px-3 py-2 text-sm text-text",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
          // Internal notes carry a gold left border so the audience is legible
          // at a glance, not just from the toggle (§5).
          internal ? "border-border border-l-4 border-l-at-risk" : "border-border",
        )}
      />

      <Button type="submit" variant="primary" disabled={pending}>
        {internal ? ACTIONS.addInternalNote : ACTIONS.reply}
      </Button>
    </form>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
        "transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        active ? "border-structure bg-canvas text-text" : "border-border text-text/70",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
