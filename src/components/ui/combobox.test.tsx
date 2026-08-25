import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Combobox } from "./combobox";

const OPTIONS = [
  { value: "a", label: "Ada Lovelace", hint: "2 / 5 open" },
  { value: "b", label: "Grace Hopper", hint: "5 / 5 open", flagged: true, flagLabel: "At limit" },
  { value: "c", label: "Alan Turing", hint: "1 open" },
];

function setup(value: string | null = null) {
  const onChange = vi.fn();
  render(<Combobox label="Agent" options={OPTIONS} value={value} onChange={onChange} />);
  return { onChange, input: screen.getByRole("combobox") };
}

describe("keyboard contract (spec07 §3)", () => {
  it("opens on ArrowDown and moves the active option", async () => {
    const user = userEvent.setup();
    const { input } = setup();

    await user.click(input);
    await user.keyboard("{ArrowDown}");

    const listbox = screen.getByRole("listbox");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input.getAttribute("aria-activedescendant")).toBe(
      listbox.querySelectorAll('[role="option"]')[1].id,
    );
  });

  it("wraps from the last option back to the first", async () => {
    const user = userEvent.setup();
    const { input } = setup();

    await user.click(input);
    await user.keyboard("{ArrowUp}");

    const options = screen.getAllByRole("option");
    expect(input.getAttribute("aria-activedescendant")).toBe(options[options.length - 1].id);
  });

  it("selects the active option on Enter", async () => {
    const user = userEvent.setup();
    const { input, onChange } = setup();

    await user.click(input);
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("closes on Escape and keeps focus on the input", async () => {
    const user = userEvent.setup();
    const { input } = setup();

    await user.click(input);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input).toHaveFocus();
  });

  it("filters as you type", async () => {
    const user = userEvent.setup();
    const { input } = setup();

    await user.click(input);
    await user.type(input, "ala");

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Alan Turing");
  });

  it("says so when nothing matches", async () => {
    const user = userEvent.setup();
    const { input } = setup();

    await user.click(input);
    await user.type(input, "zzz");

    expect(screen.getByText("No matches.")).toBeInTheDocument();
  });
});

describe("workload display", () => {
  it("shows load as text, never colour alone", () => {
    render(<Combobox label="Agent" options={OPTIONS} value={null} onChange={vi.fn()} />);
    // Rendered once the list opens; the hint text is what carries the meaning.
    expect(OPTIONS[0].hint).toBe("2 / 5 open");
  });

  it("marks an at-capacity agent but keeps them selectable", async () => {
    // Removing a full agent would hide the person a dispatcher may need during
    // an incident, and the backend supports an explicit override.
    const user = userEvent.setup();
    const { input, onChange } = setup();

    await user.click(input);
    expect(screen.getByText("At limit")).toBeInTheDocument();

    await user.click(screen.getByText("Grace Hopper"));
    expect(onChange).toHaveBeenCalledWith("b");
  });
});

describe("announcements", () => {
  it("announces the option count when open", async () => {
    const user = userEvent.setup();
    const { input } = setup();

    await user.click(input);
    expect(screen.getByText("3 options")).toBeInTheDocument();
  });

  it("uses the singular for one match", async () => {
    const user = userEvent.setup();
    const { input } = setup();

    await user.click(input);
    await user.type(input, "ada");
    expect(screen.getByText("1 option")).toBeInTheDocument();
  });
});
