import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, Link, RouterProvider } from "react-router"
import { describe, expect, it } from "vitest"

import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard"

function renderForm({ dirty }: { dirty: boolean }) {
  const router = createMemoryRouter(
    [
      {
        path: "/form",
        element: (
          <>
            <UnsavedChangesGuard when={dirty} />
            <Link to="/elsewhere">Leave</Link>
          </>
        ),
      },
      { path: "/elsewhere", element: <p>Elsewhere</p> },
    ],
    { initialEntries: ["/form"] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe("UnsavedChangesGuard", () => {
  it("asks before leaving a form with unsaved changes, and stays on Keep editing", async () => {
    const user = userEvent.setup()
    const router = renderForm({ dirty: true })

    await user.click(screen.getByRole("link", { name: "Leave" }))
    expect(await screen.findByRole("alertdialog")).toHaveTextContent(
      "Discard your changes?",
    )

    await user.click(screen.getByRole("button", { name: "Keep editing" }))
    expect(router.state.location.pathname).toBe("/form")
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("leaves on Discard changes", async () => {
    const user = userEvent.setup()
    renderForm({ dirty: true })

    await user.click(screen.getByRole("link", { name: "Leave" }))
    await user.click(
      await screen.findByRole("button", { name: "Discard changes" }),
    )

    expect(await screen.findByText("Elsewhere")).toBeInTheDocument()
  })

  it("lets an unchanged form go without asking", async () => {
    const user = userEvent.setup()
    renderForm({ dirty: false })

    await user.click(screen.getByRole("link", { name: "Leave" }))

    expect(await screen.findByText("Elsewhere")).toBeInTheDocument()
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })
})
