import { StarIcon } from "lucide-react"
import { Link, useSearchParams } from "react-router"

import { usePayPosition, type Employee } from "@/features/employees/api"
import { formatMoneyWhole } from "@/lib/format"

/**
 * A ★ on the profile when the employee is paid far from the median for their job title in
 * their country (ADR 0019). Shows nothing otherwise, or for former employees. Opened from the
 * ★ list (`?threshold=30`), it uses the list's threshold, so everyone listed has the banner.
 */
export function PayPositionBanner({ employee }: { employee: Employee }) {
  const active = employee.status === "active"
  const [searchParams] = useSearchParams()
  const threshold = searchParams.get("threshold") ?? undefined
  const position = usePayPosition(employee.id, active, threshold)
  const data = position.data

  if (
    !active ||
    !data?.flagged ||
    data.deviation_percent === null ||
    !data.peer_median
  )
    return null

  return (
    <div
      role="note"
      className="flex flex-wrap items-start gap-2 rounded-lg border border-warning-border bg-warning p-4 text-sm text-warning-foreground"
    >
      <StarIcon
        className="mt-0.5 size-4 shrink-0 fill-star-fill text-star"
        aria-label="Outlier"
      />
      <p className="flex-1">
        Paid {Math.abs(data.deviation_percent)}%{" "}
        {data.direction === "below" ? "below" : "above"} the median for{" "}
        {data.job_title} in {data.country}: the median is{" "}
        {formatMoneyWhole(data.peer_median, data.currency)} across the{" "}
        {data.peer_count} people in this role, including them. The ★ is for ±
        {data.threshold}% or more.{" "}
        <Link
          to={threshold ? `/insights?threshold=${data.threshold}` : "/insights"}
          className="font-medium underline"
        >
          See all outliers
        </Link>
      </p>
    </div>
  )
}
