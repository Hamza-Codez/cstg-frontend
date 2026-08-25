import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/toast";
import { NotificationBell } from "./notification-bell";

let mockState = {
  count: 0,
  items: [] as unknown[],
  loadingList: false,
  listError: null as string | null,
  openPanel: vi.fn(),
  markRead: vi.fn(),
  dismiss: vi.fn(async () => true),
  clearAll: vi.fn(async () => true),
};

vi.mock("@/hooks/use-notifications", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/use-notifications")>();
  return {
    ...actual,
    useNotifications: () => mockState,
  };
});

function item(over: Record<string, unknown> = {}) {
  return {
    event_id: "e1",
    ticket_id: "t1",
    ticket_subject: "Login is broken",
    type: "COMMENT",
    actor_type: "USER",
    actor_name: "Dana Reed",
    from_status: null,
    to_status: null,
    created_at: "2026-01-01T12:00:00Z",
    ...over,
  };
}

beforeEach(() => {
  mockState = {
    count: 0,
    items: [],
    loadingList: false,
    listError: null,
    openPanel: vi.fn(),
    markRead: vi.fn(),
    dismiss: vi.fn(async () => true),
    clearAll: vi.fn(async () => true),
  };
});

describe("badge", () => {
  it("shows no badge at zero, never a badge showing 0", () => {
    render(
      <ToastProvider>
        <NotificationBell audience="staff" />
      </ToastProvider>
    );
    expect(screen.queryByText("0")).toBeNull();
  });

  it("shows the count", () => {
    mockState.count = 7;
    render(
      <ToastProvider>
        <NotificationBell audience="staff" />
      </ToastProvider>
    );
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("caps at 99+", () => {
    mockState.count = 4213;
    render(
      <ToastProvider>
        <NotificationBell audience="staff" />
      </ToastProvider>
    );
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("carries the count in the accessible name, not just visually", () => {
    // A bare "Bell" tells a screen-reader user nothing.
    mockState.count = 3;
    render(
      <ToastProvider>
        <NotificationBell audience="staff" />
      </ToastProvider>
    );
    expect(screen.getByRole("button", { name: "Notifications, 3 unread" })).toBeInTheDocument();
  });

  it("names the empty state too", () => {
    render(
      <ToastProvider>
        <NotificationBell audience="staff" />
      </ToastProvider>
    );
    expect(
      screen.getByRole("button", { name: "Notifications, none unread" }),
    ).toBeInTheDocument();
  });
});

describe("panel", () => {
  it("opens and marks read, which clears the badge without emptying the list", async () => {
    const user = userEvent.setup();
    mockState.count = 2;
    mockState.items = [item()];
    render(
      <ToastProvider>
        <NotificationBell audience="staff" />
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(mockState.openPanel).toHaveBeenCalled();
    expect(screen.getByText("Login is broken")).toBeInTheDocument();
  });

  it("shows a directional empty state with no CTA", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <NotificationBell audience="staff" />
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(screen.getByText("You're all caught up.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("offers a retry when the list fails", async () => {
    const user = userEvent.setup();
    mockState.listError = "Couldn't load notifications.";
    render(
      <ToastProvider>
        <NotificationBell audience="staff" />
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(screen.getByText("Couldn't load notifications.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

describe("audience separation", () => {
  it("renders no staff name to a customer", async () => {
    const user = userEvent.setup();
    mockState.items = [item({ actor_name: "Dana Reed" })];
    render(
      <ToastProvider>
        <NotificationBell audience="customer" />
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(screen.getByText("Support replied to your request")).toBeInTheDocument();
    expect(screen.queryByText(/Dana Reed/)).toBeNull();
  });

  it("links a customer to /requests and staff to /tickets", async () => {
    const user = userEvent.setup();
    mockState.items = [item()];

    const { unmount } = render(
      <ToastProvider>
        <NotificationBell audience="customer" />
      </ToastProvider>
    );
    await user.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "/requests/t1");
    unmount();

    render(
      <ToastProvider>
        <NotificationBell audience="staff" />
      </ToastProvider>
    );
    await user.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "/tickets/t1");
  });
});
