import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("is always cursor-pointer and carries a radius from the scale (§3.1)", () => {
    render(<Button>Resolve</Button>);
    const button = screen.getByRole("button", { name: "Resolve" });
    expect(button.className).toContain("cursor-pointer");
    // Any mapped step is fine; what matters is that it is not an unmapped one,
    // which would emit no CSS and render square.
    expect(["sm", "md", "lg", "xl", "full"].some((step) => button.className.includes(`rounded-${step}`))).toBe(true);
  });

  it("uses the accent fill only for the primary CTA, with dark ink on it", () => {
    const { rerender } = render(<Button variant="primary">Assign</Button>);
    // White on the gold accent is 2.36:1 — unreadable. The dark ink is 4.99:1.
    expect(screen.getByRole("button").className).toContain("bg-accent");
    expect(screen.getByRole("button").className).toContain("text-on-accent");

    rerender(<Button variant="secondary">Cancel</Button>);
    expect(screen.getByRole("button").className).not.toContain("bg-accent");
  });

  it("defaults to type=button so it cannot submit a form by accident", () => {
    render(<Button>Close</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("calls its handler on click", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Start working</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not fire when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Resolve
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});
