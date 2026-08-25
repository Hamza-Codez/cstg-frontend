import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/toast";
import type { NotificationItem } from "@/lib/types";

import { NotificationFeed } from "./notification-feed";

/**
 * The notifications page body (P21).
 *
 * `useNotifications` is not mocked: the component drives dismissal through it,
 * and stubbing the hook would leave the optimistic-rollback contract — the part
 * most likely to break — untested. `fetch` is stubbed instead, so what is
 * exercised is the real path from click to request to rollback.
 */

function item(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    event_id: crypto.randomUUID(),
    ticket_id: crypto.randomUUID(),
    ticket_subject: "Printer is offline",
    type: "COMMENT",
    actor_type: "USER",
    actor_name: "Ada Lovelace",
    from_status: null,
    to_status: null,
    created_at: "2026-08-25T10:00:00Z",
    read: false,
    ...overrides,
  } as NotificationItem;
}

function renderFeed(items: NotificationItem[], nextCursor: string | null = null) {
  return render(
    <ToastProvider>
      <NotificationFeed audience="staff" initialItems={items} nextCursor={nextCursor} />
    </ToastProvider>,
  );
}

function stubFetch(ok: boolean) {
  const spy = vi.fn(async () =>
    ok
      ? new Response(null, { status: 204 })
      : new Response("nope", { status: 500 }),
  );
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("read and unread", () => {
  it("distinguishes them by weight, not colour alone", () => {
    stubFetch(true);
    renderFeed([
      item({ ticket_subject: "Unread one", read: false }),
      item({ ticket_subject: "Read one", read: true }),
    ]);

    // The unread sentence carries the emphasis; the read one does not.
    const unread = screen.getAllByText("Ada Lovelace replied")[0];
    expect(unread.className).toContain("font-medium");
  });

  it("says 'unread' for screen readers rather than relying on a dot", () => {
    stubFetch(true);
    renderFeed([item({ read: false })]);
    expect(screen.getByText("— unread")).toBeInTheDocument();
  });
});

describe("dismissal", () => {
  it("names the notification in the control, not a bare X", () => {
    // Fifty rows of "button, X" tells a screen-reader user nothing about which
    // one they are about to remove.
    stubFetch(true);
    renderFeed([item()]);
    expect(
      screen.getByRole("button", { name: /Dismiss — Ada Lovelace replied/ }),
    ).toBeInTheDocument();
  });

  it("removes the row at once rather than after the round trip", async () => {
    stubFetch(true);
    renderFeed([item({ ticket_subject: "Going away" })]);

    fireEvent.click(screen.getByRole("button", { name: /Dismiss/ }));

    await waitFor(() => expect(screen.queryByText("Going away")).not.toBeInTheDocument());
  });

  it("sends a DELETE for that event", async () => {
    const spy = stubFetch(true);
    const only = item();
    renderFeed([only]);

    fireEvent.click(screen.getByRole("button", { name: /Dismiss/ }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        `/api/notifications/${only.event_id}`,
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });

  it("puts the row back when the request fails", async () => {
    // Leaving it gone would be a lie about what the server holds — the whole
    // reason the optimistic update has a rollback.
    stubFetch(false);
    renderFeed([item({ ticket_subject: "Comes back" })]);

    fireEvent.click(screen.getByRole("button", { name: /Dismiss/ }));

    await waitFor(() => expect(screen.getByText("Comes back")).toBeInTheDocument());
  });

  it("restores it to its original position, not the end", async () => {
    stubFetch(false);
    renderFeed([
      item({ ticket_subject: "First" }),
      item({ ticket_subject: "Middle" }),
      item({ ticket_subject: "Last" }),
    ]);

    // A row that reappears somewhere else reads as a second, different
    // notification.
    fireEvent.click(screen.getAllByRole("button", { name: /Dismiss/ })[1]);

    await waitFor(() => {
      const subjects = screen.getAllByText(/First|Middle|Last/).map((n) => n.textContent);
      expect(subjects).toEqual(["First", "Middle", "Last"]);
    });
  });
});

describe("clear all", () => {
  it("is offered only when there is something to clear", () => {
    stubFetch(true);
    // Two renders, not a rerender: `initialItems` seeds `useState`, and React
    // will not reset state for a new prop on the same mounted component.
    const withItems = renderFeed([item()]);
    expect(screen.getByRole("button", { name: /Clear all/ })).toBeInTheDocument();
    withItems.unmount();

    renderFeed([]);
    expect(screen.queryByRole("button", { name: /Clear all/ })).not.toBeInTheDocument();
  });

  it("confirms first, and says what survives", async () => {
    // "Clear" sounds destructive enough that people reasonably fear it deletes
    // the tickets; the copy has to say otherwise.
    stubFetch(true);
    renderFeed([item()]);

    fireEvent.click(screen.getByRole("button", { name: /Clear all/ }));

    await waitFor(() =>
      expect(screen.getByText(/no tickets or history are deleted/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/only affects you/i)).toBeInTheDocument();
  });

  it("does nothing until confirmed", async () => {
    const spy = stubFetch(true);
    renderFeed([item({ ticket_subject: "Still here" })]);

    fireEvent.click(screen.getByRole("button", { name: /Clear all/ }));
    fireEvent.click(screen.getByRole("button", { name: /Cancel/ }));

    expect(screen.getByText("Still here")).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalledWith(
      "/api/notifications/clear",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("empty state", () => {
  it("carries no CTA, because there is no action to direct toward", () => {
    stubFetch(true);
    renderFeed([]);
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Clear all/ })).not.toBeInTheDocument();
  });
});

describe("paging", () => {
  it("offers older pages as a link, so the server answers them", () => {
    // A fetch here would grow a second client data path alongside the bell's.
    stubFetch(true);
    renderFeed([item()], "b3BhcXVl");
    const older = screen.getByRole("link", { name: /Load older/ });
    expect(older).toHaveAttribute("href", "/notifications?cursor=b3BhcXVl");
  });

  it("offers nothing when there is no next page", () => {
    stubFetch(true);
    renderFeed([item()], null);
    expect(screen.queryByRole("link", { name: /Load older/ })).not.toBeInTheDocument();
  });
});
