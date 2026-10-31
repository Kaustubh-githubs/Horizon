import { SearchIcon } from "lucide-react"

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
  Lookups,
} from "@/features/employees/api"
import {
  departmentChange,
  titlesForDepartment,
} from "@/features/employees/job-titles"
import { STATUS_LABELS } from "@/features/employees/status"
import { formatCount } from "@/lib/format"

// Radix Select can't hold an empty value, so "all" stands for "no filter".
const ALL = "all"

type Option = { value: string; label: string }

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | undefined
  options: Option[]
  onChange: (value: string | undefined) => void
}) {
  return (
    <Select
      value={value ?? ALL}
      onValueChange={(next) => onChange(next === ALL ? undefined : next)}
    >
      <SelectTrigger aria-label={label} className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

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
        value={filters.country}
        options={(lookups?.countries ?? []).map((c) => ({
          value: c.code,
          label: withCount(c.name, byCountry.get(c.code), Boolean(counts)),
        }))}
        onChange={(country) => onChange({ country })}
      />
      <FilterSelect
        label="Departments"
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
