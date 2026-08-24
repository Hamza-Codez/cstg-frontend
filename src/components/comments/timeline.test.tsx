import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Timeline } from "./timeline";
import type { TicketEventResponse } from "@/lib/types";

const event = (over: Partial<TicketEventResponse>): TicketEventResponse => ({
  id: crypto.randomUUID(),
  type: "CREATED",
  actor_type: "CUSTOMER",
  from_status: null,
  to_status: null,
  created_at: "2026-01-01T12:00:00Z",
  ...over,
});

describe("Timeline", () => {
  it("renders plain sentences, never enum names (§4)", () => {
    render(
      <Timeline
        audience="customer"
        events={[event({ type: "STATUS_CHANGE", from_status: "OPEN", to_status: "IN_PROGRESS" })]}
      />,
    );
    expect(screen.queryByText(/IN_PROGRESS/)).toBeNull();
    expect(screen.getByText(/In progress/)).toBeInTheDocument();
  });

  it("softens a breach for customers — no alarm language (§5)", () => {
    render(<Timeline audience="customer" events={[event({ type: "SLA_BREACH" })]} />);
    expect(screen.getByText(/taking longer than expected/i)).toBeInTheDocument();
    expect(screen.queryByText(/overdue/i)).toBeNull();
  });

  it("uses precise wording for staff on the same event", () => {
    render(<Timeline audience="staff" events={[event({ type: "SLA_BREACH" })]} />);
    expect(screen.getByText(/SLA marked overdue by system/)).toBeInTheDocument();
  });

  it("shows a directional message when nothing has happened", () => {
    render(<Timeline audience="customer" events={[]} />);
    expect(screen.getByText(/Nothing has happened yet/)).toBeInTheDocument();
  });
});
