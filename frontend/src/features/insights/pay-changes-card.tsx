import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"

import { TableSkeleton, TextLine } from "@/components/skeletons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatPercent, REASON_LABELS } from "@/features/employees/salary"
import {
  usePayChanges,
  type InsightFilters,
  type PayChangeFigures,
} from "@/features/insights/api"
import { describeScope } from "@/features/insights/segments"
import {
  formatCount,
  formatDate,
  formatMoney,
  formatMoneyCompact,
} from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Salary changes in the last 12 months, by reason (ADR 0019): how many, the average change, and
 * what they added to yearly pay, for the page's filters. Answers "what did promotions cost us
 * this year?", for the whole company or one slice of it.
 */
export function PayChangesCard({ filters }: { filters: InsightFilters }) {
  const changes = usePayChanges(filters)
  const data = changes.data

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pay changes, last 12 months</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {changes.isError ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Couldn&apos;t load the pay changes.
            <Button
              variant="outline"
              size="sm"
              onClick={() => void changes.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : !data ? (
          <div className="flex flex-col gap-4">
            <TextLine className="w-3/4" />
            <TableSkeleton columns={4} rows={5} />
          </div>
        ) : (
          <div
            className={cn(
              "flex flex-col gap-4 transition-opacity",
              changes.isPlaceholderData && "opacity-60",
            )}
          >
            <p className="text-sm text-muted-foreground">
              Raises, promotions, market adjustments and corrections effective
              since {formatDate(data.since)}, for{" "}
              {describeScope(data.filters, "everyone")}, including people who
              have since left. Each is compared with the person&apos;s previous
              salary; amounts are{" "}
              {data.converted
                ? `converted to ${data.currency}${data.rates_as_of ? ` at rates as of ${formatDate(data.rates_as_of)}` : ""}`
                : `in ${data.currency}`}
              .
              {/* We keep only today's department, title and hire date, not past ones (ADR 0019). */}
              {(data.filters.department ||
                data.filters.job_title ||
                data.filters.tenure) &&
                " People are matched on their current department, job title and tenure."}
              {data.excluded_currencies.length > 0 &&
                ` Left out (no exchange rate): ${data.excluded_currencies.join(", ")}.`}
            </p>
            {data.total.count === 0 ? (
              <p className="rounded-lg border p-6 text-sm text-muted-foreground">
                No salary changes in the last 12 months for these filters.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Changes</TableHead>
                    <TableHead className="text-right">Average change</TableHead>
                    <TableHead className="text-right">
                      Added to yearly pay
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row) => (
                    <FiguresRow
                      key={row.reason}
                      label={REASON_LABELS[row.reason]}
                      figures={row}
                      currency={data.currency}
                    />
                  ))}
                </TableBody>
                <TableFooter>
                  <FiguresRow
                    label="All changes"
                    figures={data.total}
                    currency={data.currency}
                  />
                </TableFooter>
              </Table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function FiguresRow({
  label,
  figures,
  currency,
}: {
  label: string
  figures: PayChangeFigures
  currency: string
}) {
  const cost = figures.yearly_cost
  const average = figures.average_percent
  const Icon = average !== null && average < 0 ? ArrowDownIcon : ArrowUpIcon

  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      <TableCell className="text-right tabular-nums">
        {formatCount(figures.count)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {average === null ? (
          "—"
        ) : (
          <span className="inline-flex items-center gap-0.5">
            <Icon
              className={cn(
                "size-3.5",
                average < 0 ? "text-destructive" : "text-positive",
              )}
              aria-hidden="true"
            />
            {formatPercent(average)}
          </span>
        )}
      </TableCell>
      {/* Compact for reading; the exact amount is in the tooltip. */}
      <TableCell
        className="text-right tabular-nums"
        title={cost ? formatMoney(cost, currency) : undefined}
      >
        {cost ? formatMoneyCompact(cost, currency) : "—"}
      </TableCell>
    </TableRow>
  )
}
