import * as React from "react"
import { render, screen } from "@testing-library/react"
import { Checkbox } from "./checkbox"
import { describe, expect, it } from "vitest"

describe("Checkbox", () => {
  it("renders a checkbox", () => {
    render(<Checkbox aria-label="Test checkbox" />)
    const checkbox = screen.getByRole("checkbox", { name: "Test checkbox" })
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
  })

  it("sets indeterminate on the DOM node", () => {
    render(<Checkbox aria-label="Test checkbox" indeterminate />)
    const checkbox = screen.getByRole("checkbox", { name: "Test checkbox" })
    expect(checkbox).toBePartiallyChecked()
  })

  it("removes indeterminate when prop is false", () => {
    const { rerender } = render(<Checkbox aria-label="Test checkbox" indeterminate />)
    const checkbox = screen.getByRole("checkbox", { name: "Test checkbox" })
    expect(checkbox).toBePartiallyChecked()

    rerender(<Checkbox aria-label="Test checkbox" indeterminate={false} />)
    expect(checkbox).not.toBePartiallyChecked()
  })
})
