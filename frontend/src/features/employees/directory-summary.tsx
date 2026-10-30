import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useDirectorySummary,
  type DirectoryFilters,
} from "@/features/employees/api"
import { formatCount } from "@/lib/format"
import { cn } from "@/lib/utils"

const SHOWN = 5
// One hue for magnitude, on a faint track (charting guidance; same blue as the insights charts).
const BAR = "#2a78d6"

const STATUS_WORDS: Record<string, string> = {
  active: "Active employees",
  terminated: "Former employees",
  all: "All employees",
}

type Count = { key: string; name: string; count: number }

/**
 * Cards above the directory: how many people the list holds, and how many in each country and
 * department. They follow the list's search and filters; clicking a row filters the list by it.
 */
export function DirectorySummary({
  filters,
  onFilter,
}: {
  filters: DirectoryFilters
  onFilter: (changes: Partial<DirectoryFilters>) => void
}) {
  const summary = useDirectorySummary(filters)
  const data = summary.data

  if (summary.isError) return null // the list below shows its own error

  return (
    <div
      className={cn(
        "grid gap-4 transition-opacity md:grid-cols-3",
        summary.isPlaceholderData && "opacity-60",
      )}
    >
      {!data ? (
        Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-44" />
        ))
      ) : (
        <>
          <Card>
            <CardContent className="flex h-full flex-col justify-center gap-1">
              <p className="text-sm text-muted-foreground">
                {STATUS_WORDS[filters.status ?? "active"] ?? "Employees"}
              </p>
              <p className="text-4xl font-semibold tabular-nums">
                {formatCount(data.total)}
              </p>
              <p className="text-sm text-muted-foreground">
                {data.countries.length}{" "}
                {data.countries.length === 1 ? "country" : "countries"} ·{" "}
                {data.departments.length}{" "}
                {data.departments.length === 1 ? "department" : "departments"}
              </p>
            </CardContent>
          </Card>
          <CountsCard
            title="By country"
            counts={data.countries.map((c) => ({
              key: c.code,
              name: c.name,
              count: c.count,
            }))}
            selected={filters.country}
            onSelect={(code) => onFilter({ country: code })}
          />
          <CountsCard
            title="By department"
            counts={data.departments.map((d) => ({
              key: String(d.id),
              name: d.name,
              count: d.count,
            }))}
            selected={filters.department_id}
            onSelect={(id) => onFilter({ department_id: id })}
          />
        </>
      )}
    </div>
  )
}

function CountsCard({
  title,
  counts,
  selected,
  onSelect,
}: {
  title: string
  counts: Count[]
  selected: string | undefined
  onSelect: (key: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const largest = counts[0]?.count ?? 0
  const shown = expanded ? counts : counts.slice(0, SHOWN)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {counts.length === 0 && (
          <p className="text-sm text-muted-foreground">No one matches.</p>
        )}
        {shown.map((item) => (
          <button
            key={item.key}
            type="button"
            title={`Show only ${item.name}`}
            onClick={() => onSelect(item.key)}
            className={cn(
              "flex flex-col gap-1 rounded-md px-1.5 py-1 text-left text-sm hover:bg-muted",
              selected === item.key && "bg-muted",
            )}
          >
            <span className="flex justify-between gap-2">
              <span className="truncate">{item.name}</span>
              <span className="tabular-nums">{formatCount(item.count)}</span>
            </span>
            <span className="h-1 w-full rounded-full bg-muted">
              <span
                className="block h-1 rounded-full"
                style={{
                  width: `${largest ? (item.count / largest) * 100 : 0}%`,
                  backgroundColor: BAR,
                }}
              />
            </span>
          </button>
        ))}
        {counts.length > SHOWN && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? "Show fewer" : `Show all ${counts.length}`}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
