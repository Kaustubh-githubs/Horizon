import { ArrowDownIcon, ArrowUpIcon, StarIcon } from "lucide-react"
import { Link } from "react-router"

import { TableSkeleton } from "@/components/skeletons"
import { FilterSelect } from "@/components/filter-select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useOutliers, type InsightFilters } from "@/features/insights/api"
import { LoadError } from "@/components/load-error"
import { NO_FILTERS, THRESHOLDS } from "@/features/insights/use-insights-params"
import { formatCount, formatMoney, formatMoneyWhole } from "@/lib/format"
import { cn } from "@/lib/utils"

const DIRECTION_OPTIONS = [
  { value: "below", label: "Paid below peers" },
  { value: "above", label: "Paid above peers" },
]

/**
 * The ★ list (ADR 0019): people paid far from the median for their job title in their
 * country, furthest first. The page's filters choose whose stars are listed; each person is
 * still compared with everyone in their role and country. Each name opens the profile.
 */
export function OutliersCard({
  filters,
  threshold,
  direction,
  page,
  onChange,
}: {
  filters: InsightFilters
  threshold: string
  direction: string
  page: string | undefined
  onChange: (changes: Record<string, string | undefined>) => void
}) {
  const outliers = useOutliers({ ...filters, threshold, direction, page })
  const meta = outliers.data?.meta
  const rows = outliers.data?.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StarIcon className="size-4 fill-current" aria-hidden="true" />
          Outliers
          {meta && (
            <span className="font-normal text-muted-foreground">
              · {formatCount(meta.total_count)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Active employees paid at least {threshold}% below or above the median
          for their job title in their country. Only roles with 5 or more people
          in a country are compared. The filters above choose whose stars are
          listed; everyone is still compared with their whole role in their
          country.
        </p>

        <div className="flex flex-wrap gap-2">
          <FilterSelect
            label="Paid below or above"
            allLabel="Below and above"
            className="w-48"
            value={direction === "all" ? undefined : direction}
            options={DIRECTION_OPTIONS}
            onChange={(next) => onChange({ direction: next })}
          />
          <Select
            value={threshold}
            onValueChange={(next) => onChange({ threshold: next })}
          >
            <SelectTrigger
              aria-label="How far from the median"
              className="w-48"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THRESHOLDS.map((value) => (
                <SelectItem key={value} value={value}>
                  ±{value}% from the median
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {outliers.isPending ? (
          <TableSkeleton columns={6} rows={6} />
        ) : outliers.isError ? (
          <LoadError
            error={outliers.error}
            what="the outliers"
            onRetry={() => void outliers.refetch()}
            notFound={{
              message: "A filter in this link doesn't exist in Horizon.",
              action: "Clear filters",
              onAction: () => onChange(NO_FILTERS),
            }}
          />
        ) : rows.length === 0 ? (
          <p className="rounded-lg border p-6 text-sm text-muted-foreground">
            No one is paid {threshold}% or more away from their peers&apos;
            median with these filters.
          </p>
        ) : (
          <Table
            className={cn(
              "transition-opacity",
              outliers.isPlaceholderData && "opacity-60",
            )}
          >
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Salary</TableHead>
                <TableHead className="text-right">Peers&apos; median</TableHead>
                <TableHead className="text-right">Difference</TableHead>
                <TableHead className="text-right">Peers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const below = row.deviation_percent < 0
                const Icon = below ? ArrowDownIcon : ArrowUpIcon
                return (
                  <TableRow key={row.employee.id}>
                    <TableCell>
                      <Link
                        to={`/employees/${row.employee.id}`}
                        className="inline-flex items-center gap-1.5 font-medium hover:underline"
                      >
                        <StarIcon
                          className="size-3.5 fill-star-fill text-star"
                          aria-label="Outlier"
                        />
                        {row.employee.full_name}
                      </Link>
                      <div className="font-mono text-xs text-muted-foreground">
                        {row.employee.employee_code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{row.job_title.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.country.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(row.salary, row.currency)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {formatMoneyWhole(row.peer_median, row.currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="inline-flex items-center gap-0.5">
                        <Icon
                          className={cn(
                            "size-3.5",
                            below ? "text-destructive" : "text-positive",
                          )}
                          aria-hidden="true"
                        />
                        {Math.abs(row.deviation_percent)}%{" "}
                        {below ? "below" : "above"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.peer_count}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {meta && meta.total_pages > 1 && (
          <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
            <span>
              Page {meta.page} of {formatCount(meta.total_pages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => onChange({ opage: String(meta.page - 1) })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.total_pages}
              onClick={() => onChange({ opage: String(meta.page + 1) })}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
