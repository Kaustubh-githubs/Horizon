import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLookups } from "@/features/employees/api"
import {
  useSegments,
  type SegmentBy,
  type SegmentRow,
  type SegmentStats,
} from "@/features/insights/api"
import { LoadError } from "@/features/insights/load-error"
import { SegmentChart } from "@/features/insights/segment-chart"
import { SEGMENT_NAMES, SEGMENT_TABS } from "@/features/insights/segments"
import { formatCount, formatDate, formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"

const ALL = "all"

/**
 * Pay by segment: numbers first (the table), then the chart (requirements). Picking a country
 * row drills into that country's job titles, in its own currency.
 */
export function SegmentsCard({
  by,
  country,
  onChange,
}: {
  by: SegmentBy
  country: string | undefined
  onChange: (changes: { by?: SegmentBy; country?: string }) => void
}) {
  const segments = useSegments(by, country)
  const lookups = useLookups()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pay by segment</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs
            value={by}
            onValueChange={(next) =>
              onChange({ by: next as SegmentBy, country })
            }
          >
            <TabsList>
              {SEGMENT_TABS.map((tab) => (
                <TabsTrigger key={tab.by} value={tab.by}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Select
            value={country ?? ALL}
            onValueChange={(next) =>
              onChange({ by, country: next === ALL ? undefined : next })
            }
          >
            <SelectTrigger aria-label="Country" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All countries (INR)</SelectItem>
              {(lookups.data?.countries ?? []).map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name} ({c.currency_code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {segments.isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : segments.isError ? (
          <LoadError
            error={segments.error}
            what="these figures"
            onRetry={() => void segments.refetch()}
            onShowAllCountries={() => onChange({ by, country: undefined })}
          />
        ) : (
          <div
            className={cn(
              "flex flex-col gap-6 transition-opacity",
              segments.isPlaceholderData && "opacity-60",
            )}
          >
            <CurrencyNote stats={segments.data} />
            <SegmentTable
              stats={segments.data}
              onCountry={(code) => onChange({ by: "job_title", country: code })}
            />
            <SegmentChart stats={segments.data} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CurrencyNote({ stats }: { stats: SegmentStats }) {
  const asOf = stats.rates_as_of && formatDate(stats.rates_as_of)
  const countryView = stats.by === "country" && !stats.country
  return (
    <p className="text-sm text-muted-foreground">
      {stats.country
        ? `Active employees in ${stats.country.name}, in ${stats.currency}.`
        : stats.converted
          ? `Active employees in every country, converted to ${stats.currency}${asOf ? ` at rates as of ${asOf}` : ""}.`
          : `Active employees. Each country is in its own currency; the INR column is converted${asOf ? ` at rates as of ${asOf}` : ""}. Pick a country to see its job titles.`}
      {/* In the country view those countries are still listed, in their own currency; only
          their INR column is missing. Elsewhere their employees really are left out. */}
      {stats.excluded_currencies.length > 0 &&
        (countryView
          ? ` No INR conversion (no exchange rate) for: ${stats.excluded_currencies.join(", ")}.`
          : ` Left out (no exchange rate): ${stats.excluded_currencies.join(", ")}.`)}
    </p>
  )
}

function SegmentTable({
  stats,
  onCountry,
}: {
  stats: SegmentStats
  onCountry: (code: string) => void
}) {
  const countryView = stats.by === "country" && !stats.country
  const money = (row: SegmentRow, amount: string | null) =>
    amount === null || row.currency === null
      ? "—"
      : formatMoney(amount, row.currency)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="capitalize">
            {SEGMENT_NAMES[stats.by]}
          </TableHead>
          <TableHead className="text-right">People</TableHead>
          <TableHead className="text-right">Lowest</TableHead>
          <TableHead className="text-right">Median</TableHead>
          <TableHead className="text-right">Average</TableHead>
          <TableHead className="text-right">Highest</TableHead>
          <TableHead className="text-right">Payroll</TableHead>
          {countryView && (
            <TableHead className="text-right">Median (INR)</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {stats.rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell className="font-medium">
              {countryView ? (
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
            <TableCell className="text-right tabular-nums">
              {formatCount(row.headcount)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {money(row, row.min)}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {money(row, row.median)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {money(row, row.mean)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {money(row, row.max)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {money(row, row.payroll)}
            </TableCell>
            {countryView && (
              <TableCell className="text-right text-muted-foreground tabular-nums">
                {row.converted?.median
                  ? formatMoney(row.converted.median, row.converted.currency)
                  : "—"}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
