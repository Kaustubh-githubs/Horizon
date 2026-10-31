import { PlusIcon } from "lucide-react"
import { useEffect, useEffectEvent, useState } from "react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import { DirectoryFiltersBar } from "@/features/employees/directory-filters"
import { DirectorySummary } from "@/features/employees/directory-summary"
import { EmployeesTable } from "@/features/employees/employees-table"
import {
  useDirectorySummary,
  useEmployees,
  useLookups,
} from "@/features/employees/api"
import { useDirectoryFilters } from "@/features/employees/use-directory-filters"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { formatCount } from "@/lib/format"

export function DirectoryPage() {
  const { filters, setFilters, clearFilters } = useDirectoryFilters()
  const employees = useEmployees(filters)
  const summary = useDirectorySummary(filters)
  const lookups = useLookups()

  // Search updates the URL once typing pauses, not on every key.
  const [searchText, setSearchText] = useState(filters.q ?? "")
  const debouncedSearch = useDebouncedValue(searchText.trim(), 300)
  const applySearch = useEffectEvent((q: string) => {
    if (q !== (filters.q ?? "")) setFilters({ q: q || undefined })
  })
  useEffect(() => applySearch(debouncedSearch), [debouncedSearch])

  // If the search leaves the URL some other way (the sidebar link, a pasted URL),
  // show that in the box too. Adjusting state during render avoids an extra pass.
  const [urlSearch, setUrlSearch] = useState(filters.q)
  if (filters.q !== urlSearch) {
    setUrlSearch(filters.q)
    if ((filters.q ?? "") !== searchText.trim()) setSearchText(filters.q ?? "")
  }

  const onClear = () => {
    setSearchText("")
    clearFilters()
  }

  const meta = employees.data?.meta
  const rows = employees.data?.data ?? []

  // A page past the end (an old link, or fewer employees since) moves to the last page.
  const goToLastPage = useEffectEvent((lastPage: number) =>
    setFilters({ page: String(lastPage) }),
  )
  useEffect(() => {
    if (meta && meta.page > meta.total_pages) goToLastPage(meta.total_pages)
  }, [meta])
  const sortingByPayAcrossCountries =
    filters.sort?.endsWith("current_salary") && !filters.country

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Employees</h1>
        <Button asChild>
          <Link to="/employees/new">
            <PlusIcon data-icon="inline-start" />
            Add employee
          </Link>
        </Button>
      </div>

      <DirectoryFiltersBar
        filters={filters}
        lookups={lookups.data}
        counts={summary.data}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        onChange={setFilters}
        onClear={onClear}
      />

      {/* The list's own error says it if the counts can't load either. */}
      {!summary.isError && (
        <DirectorySummary
          summary={summary.data}
          filters={filters}
          refreshing={summary.isPlaceholderData}
        />
      )}

      {sortingByPayAcrossCountries && (
        <p className="text-sm text-muted-foreground">
          Salaries are in each country&apos;s own currency. Pick a country to
          compare pay fairly.
        </p>
      )}

      {employees.isError ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border p-6">
          <p>Couldn&apos;t load employees.</p>
          <Button variant="outline" onClick={() => void employees.refetch()}>
            Try again
          </Button>
        </div>
      ) : meta?.total_count === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border p-6">
          <p>No employees match these filters.</p>
          <Button variant="outline" onClick={onClear}>
            Clear filters
          </Button>
        </div>
      ) : (
        <EmployeesTable
          employees={rows}
          isLoading={employees.isPending}
          isRefreshing={employees.isPlaceholderData}
          sort={filters.sort}
          onSort={(sort) => setFilters({ sort })}
        />
      )}

      {meta && meta.total_pages > 1 && meta.page <= meta.total_pages && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {formatCount((meta.page - 1) * meta.per_page + 1)}–
            {formatCount(Math.min(meta.page * meta.per_page, meta.total_count))}{" "}
            of {formatCount(meta.total_count)}
          </span>
          <div className="flex items-center gap-2">
            <span>
              Page {meta.page} of {formatCount(meta.total_pages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => setFilters({ page: String(meta.page - 1) })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.total_pages}
              onClick={() => setFilters({ page: String(meta.page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
