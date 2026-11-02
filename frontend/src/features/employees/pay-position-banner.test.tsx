import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  usePayPosition,
  type Employee,
  type PayPosition,
} from "@/features/employees/api"
import { PayPositionBanner } from "@/features/employees/pay-position-banner"

vi.mock("@/features/employees/api", () => ({ usePayPosition: vi.fn() }))

const employee = { id: 7, status: "active" } as Employee

function renderAt(url: string, threshold: number) {
  const data: PayPosition = {
    flagged: true,
    enough_peers: true,
    direction: "below",
    deviation_percent: -32.5,
    peer_median: "1000000.0",
    peer_count: 12,
    threshold,
    currency: "INR",
    job_title: "Software Engineer",
    country: "India",
  }
  vi.mocked(usePayPosition).mockReturnValue({ data } as ReturnType<
    typeof usePayPosition
  >)
  render(
    <MemoryRouter initialEntries={[url]}>
      <PayPositionBanner employee={employee} />
    </MemoryRouter>,
  )
}

// The ★ list can be set from ±20% to ±50%. A profile opened from it uses the same threshold,
// so someone in the list also has the banner.
describe("PayPositionBanner", () => {
  beforeEach(() => vi.mocked(usePayPosition).mockClear())

  it("asks for the threshold the ★ list was opened with, and says which one it used", () => {
    renderAt("/employees/7?threshold=30", 30)

    expect(usePayPosition).toHaveBeenCalledWith(7, true, "30")
    expect(screen.getByRole("note")).toHaveTextContent(
      "The ★ is for ±30% or more.",
    )
    expect(
      screen.getByRole("link", { name: "See all outliers" }),
    ).toHaveAttribute("href", "/insights?threshold=30")
  })

  it("uses the API's default when the profile is opened from anywhere else", () => {
    renderAt("/employees/7", 40)

    expect(usePayPosition).toHaveBeenCalledWith(7, true, undefined)
    expect(screen.getByRole("note")).toHaveTextContent(
      "The ★ is for ±40% or more.",
    )
    expect(
      screen.getByRole("link", { name: "See all outliers" }),
    ).toHaveAttribute("href", "/insights")
  })
})
