import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { SegmentRow, SegmentStats } from "@/features/insights/api"
import { SEGMENT_NAMES } from "@/features/insights/segments"
import { formatCount, formatMoney, formatMoneyCompact } from "@/lib/format"

// One series in one hue, two shades: a light bar for the middle half of salaries and a dark dot
// for the median (charting guidance: "before → after per item" style, 1 hue, 2 shades). Hairline
// grid and quiet axes, so the marks carry the meaning.
const CHART = {
  range: "#86b6ef",
  median: "#1c5cab",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  muted: "#898781",
  ink: "#52514e",
  hover: "rgba(11, 11, 11, 0.04)",
}
const BAR_ROW = 28

type Point = {
  label: string
  /** [25th, 75th percentile], the bar's two ends. */
  range: [number, number] | null
  p25: number | null
  median: number | null
  p75: number | null
  headcount: number
}

const toNumber = (value: string | null | undefined) =>
  value === null || value === undefined ? null : Number(value)

/**
 * The pay spread per segment: where the middle half of salaries sits, with the median marked.
 * A short bar means people in that segment are paid alike; a long one, that pay varies a lot.
 * Grouped by country, countries are in different currencies, so the chart uses their INR figures.
 */
export function SegmentChart({ stats }: { stats: SegmentStats }) {
  const groupedByCountry = stats.by === "country" && !stats.filters.country
  const currency = groupedByCountry ? "INR" : (stats.currency ?? "INR")
  const figures = (row: SegmentRow) =>
    groupedByCountry ? (row.converted ?? null) : row
  const data: Point[] = stats.rows.map((row) => {
    const source = figures(row)
    const p25 = toNumber(source?.p25)
    const p75 = toNumber(source?.p75)
    return {
      label: row.label,
      range: p25 === null || p75 === null ? null : [p25, p75],
      p25,
      median: toNumber(source?.median),
      p75,
      headcount: row.headcount,
    }
  })

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm font-medium">
          Pay spread by {SEGMENT_NAMES[stats.by]}
          <span className="font-normal text-muted-foreground">
            {" "}
            ({currency}
            {groupedByCountry || stats.converted ? ", converted" : ""})
          </span>
        </span>
        {/* Two marks, so a small legend; its text stays in the ink colours. */}
        <span className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-4 rounded-sm"
              style={{ backgroundColor: CHART.range }}
            />
            Middle half (25th–75th percentile)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: CHART.median }}
            />
            Median
          </span>
        </span>
      </figcaption>
      <ResponsiveContainer width="100%" height={data.length * BAR_ROW + 32}>
        <ComposedChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
        >
          <CartesianGrid horizontal={false} stroke={CHART.grid} />
          <XAxis
            type="number"
            domain={[0, "auto"]}
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
              const money = (value: number | null) =>
                value === null ? "—" : formatMoney(String(value), currency)
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-sm">
                  <p className="font-medium">{point.label}</p>
                  {point.median === null ? (
                    <p className="text-muted-foreground">No one here</p>
                  ) : (
                    <dl className="grid grid-cols-[auto_auto] gap-x-3 text-muted-foreground tabular-nums">
                      <dt>75th percentile</dt>
                      <dd className="text-right">{money(point.p75)}</dd>
                      <dt>Median</dt>
                      <dd className="text-right">{money(point.median)}</dd>
                      <dt>25th percentile</dt>
                      <dd className="text-right">{money(point.p25)}</dd>
                    </dl>
                  )}
                  <p className="text-muted-foreground">
                    {formatCount(point.headcount)}{" "}
                    {point.headcount === 1 ? "person" : "people"}
                  </p>
                </div>
              )
            }}
          />
          <Bar
            dataKey="range"
            fill={CHART.range}
            barSize={14}
            radius={4}
            isAnimationActive={false}
          />
          <Scatter
            dataKey="median"
            fill={CHART.median}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </figure>
  )
}
