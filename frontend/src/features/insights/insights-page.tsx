import { StarIcon } from "lucide-react"
import type { ReactNode } from "react"

import { AnimatedNumber } from "@/components/animated-number"
import { StickyBar } from "@/components/sticky-bar"
import { StatTileSkeleton } from "@/components/skeletons"
import { Card, CardContent } from "@/components/ui/card"
import { useOverview } from "@/features/insights/api"
import { InsightsFilters } from "@/features/insights/insights-filters"
import { LoadError } from "@/features/insights/load-error"
import { OutliersCard } from "@/features/insights/outliers-card"
import { PayChangesCard } from "@/features/insights/pay-changes-card"
import { SegmentsCard } from "@/features/insights/segments-card"
import {
  NO_FILTERS,
  useInsightsParams,
} from "@/features/insights/use-insights-params"
import { compactMoney, formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"

function StatTile({
  label,
  value,
  detail,
}: {
  label: ReactNode
  value: ReactNode
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

/**
 * "How does the org pay people?" (ADR 0019): the page's filters on top, then headline numbers,
 * pay by segment, recent pay changes and the ★ list, all for the same people.
 */
export function InsightsPage() {
  const { params, update } = useInsightsParams()
  const overview = useOverview(params.filters, params.threshold)
  const data = overview.data

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Insights</h1>
        <p className="text-sm text-muted-foreground">
          How ACME pays its active employees. The filters apply to everything on
          this page.
        </p>
      </div>
      <StickyBar>
        <InsightsFilters filters={params.filters} onChange={update} />
      </StickyBar>

      {/* A bad filter in the link (an old or edited one) fails every part the same way, so it's
          said once here instead of in each card. */}
      {overview.isError ? (
        <LoadError
          error={overview.error}
          what="the insights"
          onRetry={() => void overview.refetch()}
          notFound={{
            message: "A filter in this link doesn't exist in Horizon.",
            action: "Clear filters",
            onAction: () => update(NO_FILTERS),
          }}
        />
      ) : (
        <>
          <div
            className={cn(
              "grid gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-4",
              overview.isPlaceholderData && "opacity-60",
            )}
          >
            {!data ? (
              Array.from({ length: 4 }, (_, index) => (
                <StatTileSkeleton key={index} />
              ))
            ) : (
              <>
                <StatTile
                  label="Active employees"
                  value={
                    <AnimatedNumber
                      id="insights.headcount"
                      value={data.headcount}
                    />
                  }
                  detail={
                    data.headcount === 0
                      ? "No one matches these filters"
                      : `In ${data.countries} ${data.countries === 1 ? "country" : "countries"}`
                  }
                />
                <StatTile
                  label="Annual payroll"
                  value={
                    data.payroll ? (
                      <AnimatedNumber
                        id="insights.payroll"
                        {...compactMoney(data.payroll, data.currency)}
                      />
                    ) : (
                      "—"
                    )
                  }
                  detail={
                    data.converted
                      ? `Converted to ${data.currency}`
                      : `In ${data.currency}`
                  }
                />
                <StatTile
                  label="Median salary"
                  // Compact, so the headline fits its tile; the exact figure is underneath.
                  value={
                    data.median ? (
                      <AnimatedNumber
                        id="insights.median"
                        {...compactMoney(data.median, data.currency)}
                      />
                    ) : (
                      "—"
                    )
                  }
                  detail={
                    data.median
                      ? `${formatMoney(data.median, data.currency)}${data.converted ? `, converted to ${data.currency}` : ""}`
                      : `No one matches these filters`
                  }
                />
                <StatTile
                  label={
                    <span className="inline-flex items-center gap-1">
                      <StarIcon
                        className="size-3.5 fill-star-fill text-star"
                        aria-hidden="true"
                      />
                      Outliers
                    </span>
                  }
                  value={
                    <AnimatedNumber
                      id="insights.outliers"
                      value={data.outlier_count}
                    />
                  }
                  detail={`Paid ±${data.outlier_threshold}% or more from their peers' median`}
                />
              </>
            )}
          </div>

          <SegmentsCard
            query={{ ...params.filters, by: params.by }}
            onChange={update}
          />

          <PayChangesCard filters={params.filters} />

          <OutliersCard
            filters={params.filters}
            threshold={params.threshold}
            direction={params.direction}
            page={params.outlierPage}
            onChange={update}
          />
        </>
      )}
    </section>
  )
}
