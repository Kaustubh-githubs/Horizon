import { useSearchParams } from "react-router"

import type { DirectoryFilters } from "@/features/employees/api"

const KEYS = [
  "q",
  "country",
  "department_id",
  "job_title_id",
  "status",
  "sort",
  "page",
] as const

/**
 * Directory filters live in the URL, so a refresh or a shared link shows the same view
 * (docs/requirements.md). Changing any filter except the page goes back to page 1.
 * Clearing filters keeps the sort, since the sort isn't a filter.
 */
export function useDirectoryFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters: DirectoryFilters = Object.fromEntries(
    KEYS.map((key) => [key, searchParams.get(key) ?? undefined]),
  )

  const setFilters = (changes: Partial<DirectoryFilters>) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        if (!("page" in changes)) next.delete("page")
        return next
      },
      { replace: true },
    )
  }

  const clearFilters = () =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams()
        const sort = current.get("sort")
        if (sort) next.set("sort", sort)
        return next
      },
      { replace: true },
    )

  return { filters, setFilters, clearFilters }
}
