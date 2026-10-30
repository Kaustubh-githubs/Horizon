import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { SegmentRow, SegmentStats } from "@/features/insights/api"
import { SEGMENT_NAMES } from "@/features/insights/segments"
import { formatCount, formatMoney, formatMoneyCompact } from "@/lib/format"

// One series, so one hue and no legend: the title names it. Thin bars with a rounded end,
// a hairline grid and quiet axes, so the bars carry the meaning (charting guidance, palette checked).
const CHART = {
  bar: "#2a78d6",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  muted: "#898781",
  ink: "#52514e",
  hover: "rgba(11, 11, 11, 0.04)",
}
const BAR_ROW = 28

type Point = { label: string; median: number | null; headcount: number }

/**
 * Median pay per segment, as horizontal bars. In the country view each country is in its own
 * currency, so the chart uses the medians converted to INR to put them on one axis.
 */
export function SegmentChart({ stats }: { stats: SegmentStats }) {
  const countryView = stats.by === "country" && !stats.country
  const currency = countryView ? "INR" : (stats.currency ?? "INR")
  const medianOf = (row: SegmentRow) =>
    countryView ? (row.converted?.median ?? null) : row.median
  const data: Point[] = stats.rows.map((row) => {
    const median = medianOf(row)
    return {
      label: row.label,
      median: median === null ? null : Number(median),
      headcount: row.headcount,
    }
  })

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-medium">
        Median pay by {SEGMENT_NAMES[stats.by]}
        <span className="font-normal text-muted-foreground">
          {" "}
          ({currency}
          {countryView || stats.converted ? ", converted" : ""})
        </span>
      </figcaption>
      <ResponsiveContainer width="100%" height={data.length * BAR_ROW + 32}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid horizontal={false} stroke={CHART.grid} />
          <XAxis
            type="number"
            stroke={CHART.axis}
            tick={{ fill: CHART.muted, fontSize: 12 }}
            tickFormatter={(value: number) =>
              formatMoneyCompact(String(value), currency)
            }
          />
          <YAxis
            type="category"
            dataKey="label"
            width={190}
            stroke={CHART.axis}
            tick={{ fill: CHART.ink, fontSize: 12 }}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: CHART.hover }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as Point | undefined
              if (!active || !point) return null
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-sm">
                  <p className="font-medium">{point.label}</p>
                  <p className="text-muted-foreground tabular-nums">
                    {point.median === null
                      ? "No one in this band"
                      : `Median ${formatMoney(String(point.median), currency)}`}
                  </p>
                  <p className="text-muted-foreground">
                    {formatCount(point.headcount)}{" "}
                    {point.headcount === 1 ? "person" : "people"}
                  </p>
                </div>
              )
            }}
          />
          <Bar
            dataKey="median"
            fill={CHART.bar}
            barSize={16}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  )
}
