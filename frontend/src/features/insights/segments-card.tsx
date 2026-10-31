import { TableSkeleton, TextLine } from "@/components/skeletons"
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
import {
  useSegments,
  type SegmentQuery,
  type SegmentRow,
  type SegmentStats,
} from "@/features/insights/api"
import { LoadError } from "@/components/load-error"
import { SegmentChart } from "@/features/insights/segment-chart"
import {
  describeScope,
  GROUP_BY_OPTIONS,
  SEGMENT_NAMES,
} from "@/features/insights/segments"
import { NO_FILTERS } from "@/features/insights/use-insights-params"
import { formatCount, formatDate, formatMoneyWhole } from "@/lib/format"
import { cn } from "@/lib/utils"

type SegmentChanges = Partial<Record<keyof SegmentQuery, string | undefined>>

/**
 * Pay by segment (ADR 0019): "Group by" picks the rows; the page's filters narrow who's counted.
 * Numbers first (the table), then the chart. Picking a country row drills into that country's
 * job titles, in its own currency, by setting the page's country filter.
 */
export function SegmentsCard({
  query,
  onChange,
}: {
  query: SegmentQuery
  onChange: (changes: SegmentChanges) => void
}) {
  const segments = useSegments(query)

  return (
    // The chart's tooltip can be taller than a short chart (one country is a single row), so the
    // card mustn't clip it. Nothing else here overflows: the table scrolls in its own container.
    <Card className="overflow-visible">
      <CardHeader>
        <CardTitle>Pay by segment</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Group by</span>
          <Select value={query.by} onValueChange={(by) => onChange({ by })}>
            <SelectTrigger aria-label="Group by" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_BY_OPTIONS.map((option) => (
                <SelectItem key={option.by} value={option.by}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {segments.isPending ? (
          <div className="flex flex-col gap-6">
            <TextLine className="w-2/3" />
            <TableSkeleton columns={9} rows={8} />
          </div>
        ) : segments.isError ? (
          <LoadError
            error={segments.error}
            what="these figures"
            onRetry={() => void segments.refetch()}
            notFound={{
              message: "A filter in this link doesn't exist in Horizon.",
              action: "Clear filters",
              onAction: () => onChange(NO_FILTERS),
            }}
          />
        ) : (
          <div
            className={cn(
              "flex flex-col gap-6 transition-opacity",
              segments.isPlaceholderData && "opacity-60",
            )}
          >
            <Description stats={segments.data} />
            {segments.data.rows.every((row) => row.headcount === 0) ? (
              <p className="rounded-lg border p-6 text-sm text-muted-foreground">
                No active employees match these filters.
              </p>
            ) : (
              <>
                <SegmentTable
                  stats={segments.data}
                  onCountry={(code) =>
                    onChange({ by: "job_title", country: code })
                  }
                />
                <SegmentChart stats={segments.data} />
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Says who's counted and which currency the figures are in. */
function Description({ stats }: { stats: SegmentStats }) {
  const { country } = stats.filters
  const asOf = stats.rates_as_of && formatDate(stats.rates_as_of)
  const groupedByCountry = stats.by === "country" && !country
  const who = describeScope(stats.filters)

  return (
    <p className="text-sm text-muted-foreground">
      {who}.{" "}
      {country
        ? `In ${stats.currency}.`
        : groupedByCountry
          ? `Each country is in its own currency; the INR column is converted${asOf ? ` at rates as of ${asOf}` : ""}. Pick a country to see its job titles.`
          : `Converted to ${stats.currency}${asOf ? ` at rates as of ${asOf}` : ""}.`}
      {/* Grouped by country, those countries are still listed in their own currency; only their
          INR column is missing. Elsewhere their employees really are left out. */}
      {stats.excluded_currencies.length > 0 &&
        (groupedByCountry
          ? ` No INR conversion (no exchange rate) for: ${stats.excluded_currencies.join(", ")}.`
          : ` Left out (no exchange rate): ${stats.excluded_currencies.join(", ")}.`)}
    </p>
  )
}

// The table needs about 1,050 px for every column, more than a laptop gives it beside the sidebar.
// So columns give way as the card narrows (a container query: the card's width, not the window's,
// so the sidebar and a phone are handled alike). First the lowest and highest, which a single
// outlier sets, then the 25th and 75th percentiles, the average, the INR median, the payroll and
// the headcount. The group and its median always show.
const SHOWN_FROM = {
  range: "hidden @min-[66rem]:table-cell",
  quartiles: "hidden @min-[54rem]:table-cell",
  average: "hidden @min-[42rem]:table-cell",
  converted: "hidden @min-[36rem]:table-cell",
  payroll: "hidden @min-[29rem]:table-cell",
  people: "hidden @min-[21rem]:table-cell",
}

function SegmentTable({
  stats,
  onCountry,
}: {
  stats: SegmentStats
  onCountry: (code: string) => void
}) {
  const groupedByCountry = stats.by === "country" && !stats.filters.country
  const money = (row: SegmentRow, amount: string | null) =>
    amount === null || row.currency === null
      ? "—"
      : formatMoneyWhole(amount, row.currency)

  return (
    // Whole units: these sum up many salaries, where the cents are noise (like the peer figures in
    // the salary dialog). They're narrower too.
    <div className="@container">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="capitalize">
              {SEGMENT_NAMES[stats.by]}
            </TableHead>
            <TableHead className={cn("text-right", SHOWN_FROM.people)}>
              People
            </TableHead>
            <TableHead className={cn("text-right", SHOWN_FROM.range)}>
              Lowest
            </TableHead>
            <TableHead className={cn("text-right", SHOWN_FROM.quartiles)}>
              25th %ile
            </TableHead>
            <TableHead className="text-right">Median</TableHead>
            <TableHead className={cn("text-right", SHOWN_FROM.quartiles)}>
              75th %ile
            </TableHead>
            <TableHead className={cn("text-right", SHOWN_FROM.average)}>
              Average
            </TableHead>
            <TableHead className={cn("text-right", SHOWN_FROM.range)}>
              Highest
            </TableHead>
            <TableHead className={cn("text-right", SHOWN_FROM.payroll)}>
              Payroll
            </TableHead>
            {groupedByCountry && (
              <TableHead className={cn("text-right", SHOWN_FROM.converted)}>
                Median (INR)
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.rows.map((row) => (
            <TableRow key={row.key}>
              {/* Long job titles wrap on a narrow screen rather than push the median off it. */}
              <TableCell className="font-medium whitespace-normal">
                {groupedByCountry ? (
                  <button
                    type="button"
                    className="text-left hover:underline"
                    onClick={() => onCountry(String(row.key))}
                  >
                    {row.label}
                  </button>
                ) : (
                  row.label
                )}
              </TableCell>
              <TableCell
                className={cn("text-right tabular-nums", SHOWN_FROM.people)}
              >
                {formatCount(row.headcount)}
              </TableCell>
              <TableCell
                className={cn("text-right tabular-nums", SHOWN_FROM.range)}
              >
                {money(row, row.min)}
              </TableCell>
              <TableCell
                className={cn("text-right tabular-nums", SHOWN_FROM.quartiles)}
              >
                {money(row, row.p25)}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {money(row, row.median)}
              </TableCell>
              <TableCell
                className={cn("text-right tabular-nums", SHOWN_FROM.quartiles)}
              >
                {money(row, row.p75)}
              </TableCell>
              <TableCell
                className={cn("text-right tabular-nums", SHOWN_FROM.average)}
              >
                {money(row, row.mean)}
              </TableCell>
              <TableCell
                className={cn("text-right tabular-nums", SHOWN_FROM.range)}
              >
                {money(row, row.max)}
              </TableCell>
              <TableCell
                className={cn("text-right tabular-nums", SHOWN_FROM.payroll)}
              >
                {money(row, row.payroll)}
              </TableCell>
              {groupedByCountry && (
                <TableCell
                  className={cn(
                    "text-right text-muted-foreground tabular-nums",
                    SHOWN_FROM.converted,
                  )}
                >
                  {row.converted?.median
                    ? formatMoneyWhole(
                        row.converted.median,
                        row.converted.currency,
                      )
                    : "—"}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
