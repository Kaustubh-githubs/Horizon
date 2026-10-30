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
import type { DirectoryFilters, Lookups } from "@/features/employees/api"
import { STATUS_LABELS } from "@/features/employees/status"

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

export function DirectoryFiltersBar({
  filters,
  lookups,
  searchText,
  onSearchTextChange,
  onChange,
  onClear,
}: {
  filters: DirectoryFilters
  lookups: Lookups | undefined
  searchText: string
  onSearchTextChange: (text: string) => void
  onChange: (changes: Partial<DirectoryFilters>) => void
  onClear: () => void
}) {
  const hasFilters = Object.entries(filters).some(
    ([key, value]) => key !== "page" && key !== "sort" && Boolean(value),
  )

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
          label: c.name,
        }))}
        onChange={(country) => onChange({ country })}
      />
      <FilterSelect
        label="Departments"
        value={filters.department_id}
        options={(lookups?.departments ?? []).map((d) => ({
          value: String(d.id),
          label: d.name,
        }))}
        onChange={(department_id) => onChange({ department_id })}
      />
      <FilterSelect
        label="Job titles"
        value={filters.job_title_id}
        options={(lookups?.job_titles ?? []).map((t) => ({
          value: String(t.id),
          label: t.name,
        }))}
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
