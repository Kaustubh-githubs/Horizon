import { StarIcon } from "lucide-react"
import { Link } from "react-router"

import type { Employee } from "@/features/employees/api"
import { usePayPosition } from "@/features/insights/api"
import { formatMoneyWhole } from "@/lib/format"

/**
 * A ★ on the profile when the employee is paid far from the median for their job title in
 * their country (ADR 0019). Shows nothing otherwise, or for former employees.
 */
export function PayPositionBanner({ employee }: { employee: Employee }) {
  const active = employee.status === "active"
  const position = usePayPosition(employee.id, active)
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
      className="flex flex-wrap items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <StarIcon
        className="mt-0.5 size-4 shrink-0 fill-amber-400 text-amber-500"
        aria-label="Outlier"
      />
      <p className="flex-1">
        Paid {Math.abs(data.deviation_percent)}%{" "}
        {data.direction === "below" ? "below" : "above"} the median for{" "}
        {data.job_title} in {data.country}: the median is{" "}
        {formatMoneyWhole(data.peer_median, data.currency)} across the{" "}
        {data.peer_count} people in this role, including them.{" "}
        <Link to="/insights" className="font-medium underline">
          See all outliers
        </Link>
      </p>
    </div>
  )
}
