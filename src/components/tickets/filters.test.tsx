import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FilterBar } from "./filters";

const replace = vi.fn();
let currentParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/tickets",
  useSearchParams: () => currentParams,
}));

function setUrl(query: string) {
  currentParams = new URLSearchParams(query);
}

beforeEach(() => {
  replace.mockClear();
  setUrl("");
});

describe("role gating", () => {
  it("shows the Plan filter to a dispatcher", () => {
    render(<FilterBar role="DISPATCHER" resultCount={0} />);
    expect(screen.getAllByLabelText("Plan").length).toBeGreaterThan(0);
  });

  it("shows the Plan filter to an admin", () => {
    render(<FilterBar role="ADMIN" resultCount={0} />);
    expect(screen.getAllByLabelText("Plan").length).toBeGreaterThan(0);
  });

  it("omits the Plan filter entirely for an agent", () => {
    // Absent, not disabled (§1.2): rendering it greyed out would imply a
    // capability that does not exist. The backend refuses it regardless.
    render(<FilterBar role="AGENT" resultCount={0} />);
    expect(screen.queryByLabelText("Plan")).toBeNull();
  });

  it("still gives an agent the filters that narrow their own scope", () => {
    render(<FilterBar role="AGENT" resultCount={0} />);
    expect(screen.getAllByLabelText("Status").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Priority").length).toBeGreaterThan(0);
  });
});

describe("cursor handling", () => {
  it("drops the cursor when a filter changes", async () => {
    // The load-bearing rule: the backend 400s a cursor once the query shape
    // changes, so keeping it breaks the first interaction after filtering.
    setUrl("cursor=abc123");
    const user = userEvent.setup();
    render(<FilterBar role="ADMIN" resultCount={0} />);

    await user.selectOptions(screen.getAllByLabelText("Status")[0], "OPEN");

    expect(replace).toHaveBeenCalled();
    const url = replace.mock.calls.at(-1)?.[0] as string;
    expect(url).not.toContain("cursor");
    expect(url).toContain("status=OPEN");
  });
});

describe("active filter chips", () => {
  it("renders a chip per active filter and a clear-all", () => {
    // Without chips, a user who scrolled past the bar sees an inexplicably
    // short list.
    setUrl("status=OPEN&breached=true");
    render(<FilterBar role="ADMIN" resultCount={2} />);

    expect(screen.getByLabelText("Remove filter: Status: Open")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove filter: Overdue only")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear all" })).toBeInTheDocument();
  });

  it("renders no chips when nothing is filtered", () => {
    render(<FilterBar role="ADMIN" resultCount={0} />);
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
  });

  it("removing a chip clears just that filter and the cursor", async () => {
    setUrl("status=OPEN&priority=HIGH&cursor=xyz");
    const user = userEvent.setup();
    render(<FilterBar role="ADMIN" resultCount={1} />);

    await user.click(screen.getByLabelText("Remove filter: Status: Open"));

    const url = replace.mock.calls.at(-1)?.[0] as string;
    expect(url).not.toContain("status");
    expect(url).not.toContain("cursor");
    expect(url).toContain("priority=HIGH");
  });
});

describe("search field", () => {
  it("submits immediately on Enter rather than waiting for the debounce", async () => {
    const user = userEvent.setup();
    render(<FilterBar role="ADMIN" resultCount={0} />);

    const box = screen.getAllByPlaceholderText("Subject or description")[0];
    await user.type(box, "timeout{Enter}");

    // No fake timers advanced: if Enter did not bypass the debounce this would
    // still be pending.
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(replace.mock.calls.at(-1)?.[0]).toContain("q=timeout");
  });

  it("debounces typing rather than navigating per keystroke", async () => {
    const user = userEvent.setup();
    render(<FilterBar role="ADMIN" resultCount={0} />);

    await user.type(screen.getAllByPlaceholderText("Subject or description")[0], "abc");
    // Three keystrokes, no navigation yet — the debounce is still pending.
    expect(replace).not.toHaveBeenCalled();

    // Exactly one navigation once it settles, not one per keystroke.
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(replace.mock.calls.at(-1)?.[0]).toContain("q=abc");
  });
});

describe("accessibility", () => {
  it("announces the result count", () => {
    render(<FilterBar role="ADMIN" resultCount={7} />);
    expect(screen.getByText("7 tickets match your filters.")).toBeInTheDocument();
  });

  it("uses the singular for one result", () => {
    render(<FilterBar role="ADMIN" resultCount={1} />);
    expect(screen.getByText("1 ticket matches your filters.")).toBeInTheDocument();
  });
});
