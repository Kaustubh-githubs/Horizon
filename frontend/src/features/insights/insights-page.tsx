import { StarIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useOverview } from "@/features/insights/api"
import { OutliersCard } from "@/features/insights/outliers-card"
import { SegmentsCard } from "@/features/insights/segments-card"
import { useInsightsParams } from "@/features/insights/use-insights-params"
import { formatCount, formatMoney, formatMoneyCompact } from "@/lib/format"

function StatTile({
  label,
  value,
  detail,
}: {
  label: ReactNode
  value: string
  detail: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

/** "How does the org pay people?": headline numbers, pay by segment, then the ★ list (ADR 0019). */
export function InsightsPage() {
  const overview = useOverview()
  const { params, update } = useInsightsParams()
  const data = overview.data

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Insights</h1>
        <p className="text-sm text-muted-foreground">
          How ACME pays its active employees.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {!data ? (
          Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28" />
          ))
        ) : (
          <>
            <StatTile
              label="Active employees"
              value={formatCount(data.headcount)}
              detail={`In ${data.countries} countries`}
            />
            <StatTile
              label="Annual payroll"
              value={
                data.payroll
                  ? formatMoneyCompact(data.payroll, data.currency)
                  : "—"
              }
              detail={`Converted to ${data.currency}`}
            />
            <StatTile
              label="Median salary"
              // Compact, so the headline fits its tile; the exact figure is underneath.
              value={
                data.median
                  ? formatMoneyCompact(data.median, data.currency)
                  : "—"
              }
              detail={
                data.median
                  ? `${formatMoney(data.median, data.currency)}, across all countries`
                  : `Across all countries, in ${data.currency}`
              }
            />
            <StatTile
              label={
                <span className="inline-flex items-center gap-1">
                  <StarIcon
                    className="size-3.5 fill-amber-400 text-amber-500"
                    aria-hidden="true"
                  />
                  Outliers
                </span>
              }
              value={formatCount(data.outlier_count)}
              detail={`Paid ±${data.outlier_threshold}% or more from their peers' median`}
            />
          </>
        )}
      </div>

      <SegmentsCard
        by={params.by}
        country={params.country}
        onChange={(changes) => update(changes)}
      />

      <OutliersCard
        threshold={params.threshold}
        direction={params.direction}
        country={params.outlierCountry}
        page={params.outlierPage}
        onChange={update}
      />
    </section>
  )
}
