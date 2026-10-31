import type {
  DirectoryFilters,
  DirectorySummary as Summary,
} from "@/features/employees/api"
import { formatCount } from "@/lib/format"
import { cn } from "@/lib/utils"

const STATUS_WORDS: Record<string, string> = {
  active: "active employees",
  terminated: "former employees",
  all: "employees",
}

const plural = (count: number, one: string, many: string) =>
  `${formatCount(count)} ${count === 1 ? one : many}`

/**
 * One line above the list (ADR 0019): how many people match the search and filters, and across
 * how many countries and departments. How people are spread is on the Insights page.
 */
export function DirectorySummary({
  summary,
  filters,
  refreshing,
}: {
  summary: Summary | undefined
  filters: DirectoryFilters
  refreshing: boolean
}) {
  if (!summary) return <p className="h-5" aria-hidden="true" />

  const who = STATUS_WORDS[filters.status ?? "active"] ?? "employees"
  return (
    <p
      aria-live="polite"
      className={cn(
        "text-sm text-muted-foreground transition-opacity",
        refreshing && "opacity-60",
      )}
    >
      <span className="font-medium text-foreground tabular-nums">
        {formatCount(summary.total)}
      </span>{" "}
      {who} {summary.total === 1 ? "matches" : "match"} ·{" "}
      {plural(summary.country_count, "country", "countries")} ·{" "}
      {plural(summary.department_count, "department", "departments")}
    </p>
  )
}
