import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, useLocation } from "react-router"
import { describe, expect, it } from "vitest"

import { useDirectoryFilters } from "@/features/employees/use-directory-filters"

function renderFilters(url: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  )
  return renderHook(
    () => ({ ...useDirectoryFilters(), search: useLocation().search }),
    { wrapper },
  )
}

// The directory's filters live in the URL, so a refresh or a shared link shows the same view.
describe("useDirectoryFilters", () => {
  it("reads the filters from the URL, with the country code uppercased", () => {
    const { result } = renderFilters("/employees?country=in&status=all&page=3")

    expect(result.current.filters).toMatchObject({
      country: "IN",
      status: "all",
      page: "3",
    })
  })

  it("goes back to page 1 when a filter changes", () => {
    const { result } = renderFilters("/employees?country=IN&page=3")

    act(() => result.current.setFilters({ department_id: "2" }))

    expect(result.current.search).toBe("?country=IN&department_id=2")
  })

  it("keeps the page when the page itself changes", () => {
    const { result } = renderFilters("/employees?country=IN&page=3")

    act(() => result.current.setFilters({ page: "4" }))

    expect(result.current.search).toBe("?country=IN&page=4")
  })

  it("keeps the sort when clearing the filters", () => {
    const { result } = renderFilters(
      "/employees?country=IN&q=rao&sort=-hire_date&page=2",
    )

    act(() => result.current.clearFilters())

    expect(result.current.search).toBe("?sort=-hire_date")
  })
})
