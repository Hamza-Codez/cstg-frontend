import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BarRow, Stat } from "./stat";

describe("Stat", () => {
  it("carries its tone in the header band, not the number", () => {
    const { container, rerender } = render(<Stat label="Overdue" value="3" accent="overdue" />);
    expect(container.innerHTML).toContain("bg-overdue");

    rerender(<Stat label="Open" value="3" accent="structure" />);
    expect(container.innerHTML).not.toContain("bg-overdue");
  });

  it("always renders its label and value as text", () => {
    render(<Stat label="Breach rate" value="12.5%" hint="of all tickets" />);
    expect(screen.getByText("Breach rate")).toBeInTheDocument();
    expect(screen.getByText("12.5%")).toBeInTheDocument();
    expect(screen.getByText("of all tickets")).toBeInTheDocument();
  });
});

describe("BarRow", () => {
  it("states the value in text, not only bar length (§9 a11y)", () => {
    render(<BarRow label="Open" value={7} max={10} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("scales width against the row maximum", () => {
    const { container } = render(<BarRow label="Open" value={5} max={10} />);
    const bar = container.querySelector('[role="presentation"]') as HTMLElement;
    expect(bar.style.width).toBe("50%");
  });

  it("does not divide by zero on an empty dataset", () => {
    const { container } = render(<BarRow label="Open" value={0} max={0} />);
    const bar = container.querySelector('[role="presentation"]') as HTMLElement;
    expect(bar.style.width).toBe("0%");
  });
});
