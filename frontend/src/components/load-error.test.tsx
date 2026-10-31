import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { LoadError } from "@/components/load-error"
import { ApiError } from "@/lib/api"

const notFound = {
  message: "A filter in this link doesn't exist in Horizon.",
  action: "Clear filters",
}

describe("LoadError", () => {
  it("says what didn't load and offers a retry", async () => {
    const onRetry = vi.fn()
    render(<LoadError what="the budgets" onRetry={onRetry} />)

    expect(screen.getByText("Couldn't load the budgets.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  // A bad filter in an old or edited link: retrying can't help.
  it("offers its own action for a 404 instead of a retry", async () => {
    const onAction = vi.fn()
    render(
      <LoadError
        error={new ApiError(404, { base: ["Country not found"] })}
        what="the insights"
        onRetry={vi.fn()}
        notFound={{ ...notFound, onAction }}
      />,
    )

    expect(screen.getByText(notFound.message)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(onAction).toHaveBeenCalledOnce()
  })

  it("treats a 404 as an ordinary failure when there's no 404 action", () => {
    render(
      <LoadError
        error={new ApiError(404, { base: ["Not found"] })}
        what="the timeline"
        onRetry={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument()
  })
})
