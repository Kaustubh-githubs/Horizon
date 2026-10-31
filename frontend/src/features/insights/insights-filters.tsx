import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLookups } from "@/features/employees/api"
import {
  departmentChange,
  titlesForDepartment,
} from "@/features/employees/job-titles"
import type { InsightFilters } from "@/features/insights/api"
import { TENURE_BANDS } from "@/features/insights/segments"
import { NO_FILTERS } from "@/features/insights/use-insights-params"

// Radix Select can't hold an empty value, so "all" stands for "no filter".
const ALL = "all"
type Option = { value: string; label: string }

function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string
  allLabel: string
  value: string | undefined
  options: Option[]
  onChange: (value: string | undefined) => void
}) {
  return (
    <Select
      value={value ?? ALL}
      onValueChange={(next) => onChange(next === ALL ? undefined : next)}
    >
      <SelectTrigger aria-label={label} className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * The page's filters (ADR 0019): country, department, job title and tenure, in any combination.
 * Every part of the page follows them: the headline numbers, pay by segment, pay changes and the
 * ★ list.
 */
export function InsightsFilters({
  filters,
  onChange,
}: {
  filters: InsightFilters
  onChange: (changes: Partial<InsightFilters>) => void
}) {
  const lookups = useLookups()
  const filtered = Object.values(filters).some(Boolean)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        label="Country"
        allLabel="All countries"
        value={filters.country}
        options={(lookups.data?.countries ?? []).map((c) => ({
          value: c.code,
          label: `${c.name} (${c.currency_code})`,
        }))}
        onChange={(country) => onChange({ country })}
      />
      <FilterSelect
        label="Department"
        allLabel="All departments"
        value={filters.department_id}
        options={(lookups.data?.departments ?? []).map((d) => ({
          value: String(d.id),
          label: d.name,
        }))}
        onChange={(department_id) =>
          onChange(
            departmentChange(lookups.data, department_id, filters.job_title_id),
          )
        }
      />
      <FilterSelect
        label="Job title"
        allLabel="All job titles"
        value={filters.job_title_id}
        options={titlesForDepartment(lookups.data, filters.department_id).map(
          (t) => ({
            value: String(t.id),
            label: t.name,
          }),
        )}
        onChange={(job_title_id) => onChange({ job_title_id })}
      />
      <FilterSelect
        label="Tenure"
        allLabel="Any tenure"
        value={filters.tenure}
        options={TENURE_BANDS.map((band) => ({
          value: band.key,
          label: band.label,
        }))}
        onChange={(tenure) => onChange({ tenure })}
      />
      {filtered && (
        <Button variant="ghost" onClick={() => onChange(NO_FILTERS)}>
          Clear filters
        </Button>
      )}
    </div>
  )
}
