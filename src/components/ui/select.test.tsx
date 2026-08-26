import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Select } from "./select";

/**
 * The ARIA and keyboard contract for the listbox that replaced the native
 * `<select>`.
 *
 * A native control gave all of this for free; hand-rolling it means every part
 * has to be pinned down, because the failure mode is silent — it looks right
 * and stops working for anyone not using a mouse.
 */

const ROLES = [
  { value: "AGENT", label: "Agent" },
  { value: "DISPATCHER", label: "Dispatcher" },
  { value: "ADMIN", label: "Admin" },
];

function open() {
  fireEvent.click(screen.getByRole("combobox"));
}

describe("the trigger", () => {
  it("reports its expanded state", () => {
    render(<Select label="Role" options={ROLES} />);
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("shows the placeholder until something is chosen", () => {
    render(<Select label="Status" options={ROLES} placeholder="Any" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Any");
  });

  it("omits the empty choice when required", () => {
    // A staff member always has a role, so "Any" would be an answer the
    // backend rejects.
    render(<Select label="Role" options={ROLES} required defaultValue="AGENT" />);
    open();
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.queryByRole("option", { name: /Any/ })).not.toBeInTheDocument();
  });
});

describe("keyboard", () => {
  it("opens on ArrowDown", () => {
    render(<Select label="Role" options={ROLES} required />);
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("moves the active option and selects with Enter", () => {
    const onValueChange = vi.fn();
    render(<Select label="Role" options={ROLES} required onValueChange={onValueChange} />);
    const trigger = screen.getByRole("combobox");

    fireEvent.keyDown(trigger, { key: "ArrowDown" }); // open, active = Agent
    fireEvent.keyDown(trigger, { key: "ArrowDown" }); // Dispatcher
    fireEvent.keyDown(trigger, { key: "Enter" });

    expect(onValueChange).toHaveBeenCalledWith("DISPATCHER");
  });

  it("jumps to first and last with Home and End", () => {
    const onValueChange = vi.fn();
    render(<Select label="Role" options={ROLES} required onValueChange={onValueChange} />);
    const trigger = screen.getByRole("combobox");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "End" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(onValueChange).toHaveBeenCalledWith("ADMIN");
  });

  it("closes on Escape WITHOUT changing the value", () => {
    // Escape means "never mind". A select that committed on Escape would be a
    // trap: there would be no way to back out once open.
    const onValueChange = vi.fn();
    render(<Select label="Role" options={ROLES} required onValueChange={onValueChange} />);
    const trigger = screen.getByRole("combobox");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Escape" });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("jumps by typed letters", () => {
    const onValueChange = vi.fn();
    render(<Select label="Role" options={ROLES} required onValueChange={onValueChange} />);
    const trigger = screen.getByRole("combobox");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "d" });
    fireEvent.keyDown(trigger, { key: "Enter" });

    expect(onValueChange).toHaveBeenCalledWith("DISPATCHER");
  });
});

describe("screen reader contract", () => {
  it("points aria-activedescendant at a real option", () => {
    render(<Select label="Role" options={ROLES} required />);
    open();

    const listbox = screen.getByRole("listbox");
    const activeId = listbox.getAttribute("aria-activedescendant");
    expect(activeId).toBeTruthy();
    expect(document.getElementById(activeId as string)).toBeInTheDocument();
  });

  it("marks exactly one option selected", () => {
    render(<Select label="Role" options={ROLES} required defaultValue="ADMIN" />);
    open();

    const selected = screen
      .getAllByRole("option")
      .filter((o) => o.getAttribute("aria-selected") === "true");
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent("Admin");
  });

  it("keeps the label available when it is visually hidden", () => {
    render(<Select label="Priority" options={ROLES} hideLabel required />);
    expect(screen.getByRole("combobox", { name: "Priority" })).toBeInTheDocument();
  });
});

describe("form submission", () => {
  it("carries the value in a hidden input, so a plain form still works", () => {
    // This is what let the native control be replaced without every call site
    // becoming controlled.
    const { container } = render(
      <Select label="Role" options={ROLES} required name="role" defaultValue="AGENT" />,
    );
    const hidden = container.querySelector('input[type="hidden"][name="role"]');
    expect(hidden).toHaveValue("AGENT");
  });

  it("updates that hidden value on selection", () => {
    const { container } = render(
      <Select label="Role" options={ROLES} required name="role" defaultValue="AGENT" />,
    );
    open();
    fireEvent.click(screen.getByRole("option", { name: "Admin" }));

    expect(container.querySelector('input[name="role"]')).toHaveValue("ADMIN");
  });
});

describe("theme", () => {
  it("styles the active option from the palette, not the browser default", () => {
    // The whole reason the native select was replaced: `<option>` highlight is
    // drawn by the OS and comes out sky blue against a slate palette.
    render(<Select label="Role" options={ROLES} required defaultValue="AGENT" />);
    open();

    const active = screen.getAllByRole("option")[0];
    expect(active.className).toContain("bg-structure");
    expect(active.className).toContain("text-text-inverse");
  });
});
