import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CircleXIcon,
  type LucideIcon,
} from "lucide-react"

import type { BudgetStatus } from "@/features/budgets/api"
import { cn } from "@/lib/utils"

// Status colours are reserved for status and always come with an icon and a label, never colour
// alone (charting guidance's status palette: good, warning, critical).
const STATUSES: Record<
  BudgetStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  under: {
    label: "Under budget",
    icon: CircleCheckIcon,
    className: "text-status-good",
  },
  near: {
    label: "Near the limit",
    icon: CircleAlertIcon,
    className: "text-status-warning",
  },
  over: {
    label: "Over budget",
    icon: CircleXIcon,
    className: "text-status-critical",
  },
  no_budget: {
    label: "No budget",
    icon: CircleDashedIcon,
    className: "text-muted-foreground",
  },
}

/** A status with its icon and label, e.g. "✓ Under budget · 83%". */
export function BudgetStatusLabel({
  status,
  percent,
  className,
}: {
  status: BudgetStatus
  percent?: number | null
  className?: string
}) {
  const { label, icon: Icon, className: tone } = STATUSES[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {label}
      {percent !== null && percent !== undefined && (
        <span className="tabular-nums">· {percent}%</span>
      )}
    </span>
  )
}
