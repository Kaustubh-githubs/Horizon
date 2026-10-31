import { SearchIcon } from "lucide-react"

import { FilterSelect } from "@/components/filter-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  DirectoryFilters,
  DirectorySummary,
} from "@/features/employees/api"
import type { Lookups } from "@/features/lookups/api"
import {
  departmentChange,
  titlesForDepartment,
} from "@/features/lookups/job-titles"
import { STATUS_LABELS } from "@/features/employees/status"
import { formatCount } from "@/lib/format"

// "India (3,648)": how many people the option would give with the other filters and the search.
// Options nobody matches say 0. Before the counts load, just the name.
const withCount = (name: string, count: number | undefined, loaded: boolean) =>
  loaded ? `${name} (${formatCount(count ?? 0)})` : name

export function DirectoryFiltersBar({
  filters,
  lookups,
  counts,
  searchText,
  onSearchTextChange,
  onChange,
  onClear,
}: {
  filters: DirectoryFilters
  lookups: Lookups | undefined
  /** Each country's and department's count ignores its own filter (ADR 0019). */
  counts: DirectorySummary | undefined
  searchText: string
  onSearchTextChange: (text: string) => void
  onChange: (changes: Partial<DirectoryFilters>) => void
  onClear: () => void
}) {
  const hasFilters = Object.entries(filters).some(
    ([key, value]) => key !== "page" && key !== "sort" && Boolean(value),
  )
  const byCountry = new Map(counts?.countries.map((c) => [c.code, c.count]))
  const byDepartment = new Map(counts?.departments.map((d) => [d.id, d.count]))

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-72">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search employees"
          placeholder="Search name, email or code"
          className="pl-8"
          value={searchText}
          onChange={(event) => onSearchTextChange(event.target.value)}
        />
      </div>

      <FilterSelect
        label="Countries"
        allLabel="All countries"
        className="w-44"
        value={filters.country}
        options={(lookups?.countries ?? []).map((c) => ({
          value: c.code,
          label: withCount(c.name, byCountry.get(c.code), Boolean(counts)),
        }))}
        onChange={(country) => onChange({ country })}
      />
      <FilterSelect
        label="Departments"
        allLabel="All departments"
        searchPlaceholder="Search departments"
        className="w-44"
        value={filters.department_id}
        options={(lookups?.departments ?? []).map((d) => ({
          value: String(d.id),
          label: withCount(d.name, byDepartment.get(d.id), Boolean(counts)),
        }))}
        onChange={(department_id) =>
          onChange(
            departmentChange(lookups, department_id, filters.job_title_id),
          )
        }
      />
      <FilterSelect
        label="Job titles"
        allLabel="All job titles"
        searchPlaceholder="Search job titles"
        className="w-44"
        value={filters.job_title_id}
        options={titlesForDepartment(lookups, filters.department_id).map(
          (t) => ({
            value: String(t.id),
            label: t.name,
          }),
        )}
        onChange={(job_title_id) => onChange({ job_title_id })}
      />

      <Select
        value={filters.status ?? "active"}
        onValueChange={(status) =>
          onChange({ status: status === "active" ? undefined : status })
        }
      >
        <SelectTrigger aria-label="Status" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">{STATUS_LABELS.active}</SelectItem>
          <SelectItem value="terminated">{STATUS_LABELS.terminated}</SelectItem>
          <SelectItem value="all">All statuses</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  )
}
