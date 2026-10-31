import { ScrollTextIcon } from "lucide-react"
import { Fragment, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useEmployeeAuditLog,
  type AuditLogRow,
  type Employee,
} from "@/features/employees/api"
import { fieldLabel, formatFieldValue } from "@/features/employees/field-values"
import { FromTo } from "@/features/employees/from-to"
import { REASON_LABELS } from "@/features/employees/salary"
import { formatDateTime } from "@/lib/format"

// Anything else (a model audited later) gets a plain label instead of breaking the panel.
const ACTIONS: Record<string, Record<string, string> | undefined> = {
  employee: {
    create: "Employee added",
    update: "Employee changed",
    destroy: "Employee deleted",
  },
  salary_revision: {
    create: "Salary revision added",
    update: "Salary revision changed",
    destroy: "Salary revision deleted",
  },
}

const actionLabel = (row: AuditLogRow) =>
  ACTIONS[row.model]?.[row.action] ??
  `${row.model.replaceAll("_", " ")}: ${row.action}`

/**
 * Every saved change to the employee and their salary revisions (ADR 0012, 0021), in a panel
 * from the right: each changed column, old → new, who, when and why. Loaded only when opened.
 */
export function AuditLogSheet({ employee }: { employee: Employee }) {
  const [open, setOpen] = useState(false)
  const log = useEmployeeAuditLog(employee.id, open)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <ScrollTextIcon data-icon="inline-start" />
          Audit log
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Audit log</SheetTitle>
          <SheetDescription>
            Every saved change to {employee.full_name} and their salary, newest
            first: what changed, who changed it, when, and why.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {log.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : log.isError ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Couldn&apos;t load the audit log.
              <Button
                variant="outline"
                size="sm"
                onClick={() => void log.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : log.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No changes recorded since this employee was loaded into Horizon.
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {log.data.map((row) => (
                <Row key={row.id} row={row} />
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Row({ row }: { row: AuditLogRow }) {
  const why = [
    row.reason && REASON_LABELS[row.reason],
    row.comment && `“${row.comment}”`,
  ].filter(Boolean)
  // The reason is already the "Why" line, so it isn't listed again as a column.
  const changes = row.reason
    ? row.changes.filter((change) => change.field !== "reason")
    : row.changes

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium first-letter:uppercase">
          {actionLabel(row)}
        </span>
        <span className="text-xs text-muted-foreground">
          {row.changed_by ?? "Outside the app"} ·{" "}
          {formatDateTime(row.created_at)}
        </span>
        {why.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Why: {why.join(" · ")}
          </span>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {changes.map((change) => (
          <Fragment key={change.field}>
            <dt className="text-muted-foreground">
              {fieldLabel(change.field)}
            </dt>
            <dd className="min-w-0 break-words">
              <FromTo
                from={
                  change.from &&
                  formatFieldValue(change.field, change.from, row.currency)
                }
                to={formatFieldValue(change.field, change.to, row.currency)}
              />
            </dd>
          </Fragment>
        ))}
      </dl>
    </li>
  )
}
