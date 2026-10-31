import { useState } from "react"

import { LoadError } from "@/components/load-error"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useBudgetAudits,
  type BudgetAudit,
  type DepartmentBudget,
} from "@/features/budgets/api"
import { formatDateTime, formatMoney } from "@/lib/format"

/** Who set and changed a department's budget, and when, from the audit trail (ADR 0012, 0020). */
export function BudgetHistoryDialog({
  department,
  year,
  currency,
  onClose,
}: {
  department: DepartmentBudget | null
  year: number
  currency: string
  onClose: () => void
}) {
  // The last department shown, so the content stays put while the dialog animates closed.
  const [shown, setShown] = useState(department)
  if (department && department !== shown) setShown(department)

  return (
    <Dialog
      open={department !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {shown?.name}&apos;s {year} budget history
          </DialogTitle>
          <DialogDescription>
            Every time it was set or changed, newest first.
          </DialogDescription>
        </DialogHeader>
        {shown && (
          <History budgetId={shown.budget?.id ?? null} currency={currency} />
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function History({
  budgetId,
  currency,
}: {
  budgetId: number | null
  currency: string
}) {
  const audits = useBudgetAudits(budgetId)

  if (budgetId === null)
    return <p className="text-sm text-muted-foreground">No budget set yet.</p>
  if (audits.isError)
    return (
      <LoadError what="the history" onRetry={() => void audits.refetch()} />
    )
  if (!audits.data) return <Skeleton className="h-24 w-full" />
  if (audits.data.length === 0)
    return (
      <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
    )

  return (
    <ol className="flex flex-col divide-y">
      {audits.data.map((audit) => (
        <li key={audit.id} className="flex flex-col gap-0.5 py-2">
          <span className="text-sm font-medium">
            {describe(audit, currency)}
          </span>
          <span className="text-xs text-muted-foreground">
            {audit.changed_by ?? "Outside the app"} ·{" "}
            {formatDateTime(audit.created_at)}
          </span>
        </li>
      ))}
    </ol>
  )
}

function describe(audit: BudgetAudit, currency: string): string {
  if (!audit.to) return "Changed"
  const to = formatMoney(audit.to, currency)
  if (!audit.from) return `Set to ${to}`
  const raised = Number(audit.to) > Number(audit.from)
  return `${raised ? "Raised" : "Cut"} from ${formatMoney(audit.from, currency)} to ${to}`
}
