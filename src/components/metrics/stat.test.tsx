import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

  it("never wears the accent, which is CTA-only", () => {
    // `StatAccent` no longer offers it, so this cannot be written by mistake —
    // the test is here to fail loudly if someone widens the union back.
    const source = readFileSync(resolve("src/components/metrics/stat.tsx"), "utf8");
    expect(source).not.toContain("gradient-accent");
    expect(source).not.toContain("bg-accent");
  });

  it("keeps every tile the same height so a row of numbers sits on one line", () => {
    // A label that wraps used to make its header band taller and push that
    // tile's number below its neighbours', which reads as a rendering fault.
    const { container } = render(
      <Stat label="A label long enough to wrap on a narrow tile" value="3" />,
    );
    expect(container.firstElementChild?.className).toContain("h-full");
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
