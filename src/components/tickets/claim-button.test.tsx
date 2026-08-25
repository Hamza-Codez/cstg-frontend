import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClaimButton } from "./claim-button";

const show = vi.fn();
let state: { ok?: boolean; taken?: string; error?: string } = {};

vi.mock("@/app/actions/staff", () => ({
  claimAction: vi.fn(),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ show }),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: () => [state, vi.fn(), false],
  };
});

beforeEach(() => {
  show.mockClear();
  state = {};
});

describe("ClaimButton", () => {
  it("renders the take action", () => {
    render(<ClaimButton ticketId="t1" />);
    expect(screen.getByRole("button", { name: /take this ticket/i })).toBeInTheDocument();
  });

  it("confirms a successful claim", () => {
    state = { ok: true };
    render(<ClaimButton ticketId="t1" />);
    expect(show).toHaveBeenCalledWith("Ticket is yours");
  });

  it("reports a lost race as INFORMATION, not an error", () => {
    // Two agents scanning one queue will race; that is the normal outcome, so
    // it must not use the error variant (spec07 frontend §2).
    state = { taken: "Someone else just took this one." };
    render(<ClaimButton ticketId="t1" />);
    expect(show).toHaveBeenCalledWith("Someone else just took this one.");
    expect(show).not.toHaveBeenCalledWith(expect.anything(), "error");
  });

  it("reports a capacity refusal as an error, naming the limit", () => {
    state = { error: "You're at your ticket limit (5). Resolve something first." };
    render(<ClaimButton ticketId="t1" />);
    expect(show).toHaveBeenCalledWith(
      "You're at your ticket limit (5). Resolve something first.",
      "error",
    );
  });

  it("submits the ticket id", async () => {
    const user = userEvent.setup();
    render(<ClaimButton ticketId="abc-123" />);
    const hidden = document.querySelector('input[name="ticket_id"]') as HTMLInputElement;
    expect(hidden.value).toBe("abc-123");
    await user.click(screen.getByRole("button", { name: /take this ticket/i }));
  });
});
