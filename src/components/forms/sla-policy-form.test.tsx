import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SlaPolicyForm } from "./sla-policy-form";

const action = vi.fn();

vi.mock("@/app/actions/sla-policy", () => ({
  replaceSlaPolicyAction: (...args: unknown[]) => action(...args),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ show: vi.fn() }),
}));

const DURATIONS = [
  { priority: "CRITICAL" as const, seconds: 2 * 3600 },
  { priority: "HIGH" as const, seconds: 8 * 3600 },
  { priority: "MEDIUM" as const, seconds: 24 * 3600 },
  { priority: "LOW" as const, seconds: 72 * 3600 },
];

beforeEach(() => action.mockClear());

describe("the applies-to-new-tickets notice", () => {
  it("states the rule above the form", () => {
    // The single most important string on the page: editing these looks like it
    // changes existing commitments, and it does not.
    render(<SlaPolicyForm durations={DURATIONS} />);
    expect(screen.getByText(/apply to new tickets only/i)).toBeInTheDocument();
  });
});

describe("hours, not seconds", () => {
  it("shows whole hours rather than raw seconds", () => {
    // A form demanding 7200 invites a wrong-by-60x typo.
    render(<SlaPolicyForm durations={DURATIONS} />);
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("72")).toBeInTheDocument();
  });

  it("keeps sub-hour targets legible rather than rounding them to zero", () => {
    render(<SlaPolicyForm durations={[{ priority: "CRITICAL", seconds: 1800 }]} />);
    expect(screen.getByDisplayValue("0.5")).toBeInTheDocument();
  });

  it("submits all four rows together, never per-row", () => {
    // The backend requires a total policy; a per-row save would pass through
    // states that are not.
    render(<SlaPolicyForm durations={DURATIONS} />);
    expect(screen.getAllByRole("button", { name: /save changes/i })).toHaveLength(1);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(4);
  });
});

describe("inverted ladder", () => {
  it("says nothing when the ladder is ordered", () => {
    render(<SlaPolicyForm durations={DURATIONS} />);
    expect(screen.queryByText(/Is that intended\?/)).toBeNull();
  });

  it("warns when a higher priority is slower than a lower one", async () => {
    const user = userEvent.setup();
    render(<SlaPolicyForm durations={DURATIONS} />);

    // Critical 12h against High 8h.
    const critical = screen.getAllByRole("spinbutton")[0];
    await user.clear(critical);
    await user.type(critical, "12");

    expect(await screen.findByText(/Is that intended\?/)).toBeInTheDocument();
  });

  it("warns but does NOT block the save", async () => {
    // The backend permits an unusual ladder, and blocking would be the UI
    // inventing a rule the server does not have.
    const user = userEvent.setup();
    render(<SlaPolicyForm durations={DURATIONS} />);

    const critical = screen.getAllByRole("spinbutton")[0];
    await user.clear(critical);
    await user.type(critical, "12");

    await screen.findByText(/Is that intended\?/);
    expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled();
  });
});
