import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "./badge";

describe("Badge", () => {
  it("carries meaning in text, not colour alone (a11y §9)", () => {
    render(<Badge tone="overdue">Overdue</Badge>);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("keeps the dot decorative so screen readers hear only the label", () => {
    const { container } = render(<Badge tone="on-track">Open</Badge>);
    expect(container.querySelector("[aria-hidden]")).not.toBeNull();
  });

  it("tints only the overdue badge (§3.3)", () => {
    const { container, rerender } = render(<Badge tone="overdue">Overdue</Badge>);
    expect(container.firstElementChild?.className).toContain("bg-overdue/10");

    rerender(<Badge tone="on-track">Open</Badge>);
    expect(container.firstElementChild?.className).not.toContain("bg-on-track/10");
  });
});
