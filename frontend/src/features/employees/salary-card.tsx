import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useSalaryHistory, type Employee } from "@/features/employees/api"
import { ChangeSalaryDialog } from "@/features/employees/change-salary-dialog"
import { formatPercent, REASON_LABELS } from "@/features/employees/salary"
import { formatDate, formatDateTime, formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"

/** The current salary, every change that led to it, and (for active employees) a way to change it. */
export function SalaryCard({ employee }: { employee: Employee }) {
  const history = useSalaryHistory(employee.id)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salary</CardTitle>
        {employee.status === "active" && (
          <CardAction>
            <ChangeSalaryDialog employee={employee} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="text-2xl font-semibold tabular-nums">
            {formatMoney(employee.current_salary, employee.current_currency)}
          </p>
          <p className="text-sm text-muted-foreground">Annual gross base pay</p>
        </div>

        {history.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : history.isError ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Couldn&apos;t load the salary history.
            <Button
              variant="outline"
              size="sm"
              onClick={() => void history.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Effective</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.data.data.map((revision) => (
                <TableRow key={revision.id}>
                  <TableCell>
                    <div>{formatDate(revision.effective_from)}</div>
                    <div className="text-xs text-muted-foreground">
                      Recorded {formatDateTime(revision.recorded_at)}
                    </div>
                  </TableCell>
                  <TableCell>{REASON_LABELS[revision.reason]}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(revision.amount, revision.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {revision.change_percent === null ||
                    revision.previous_amount === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <ChangeBadge
                        percent={revision.change_percent}
                        from={revision.previous_amount}
                        to={revision.amount}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// Direction is shown by the arrow and the sign as well as the colour. It comes from the
// amounts, not the rounded %, so a tiny raise that rounds to 0% still reads as a raise.
function ChangeBadge({
  percent,
  from,
  to,
}: {
  percent: number
  from: string
  to: string
}) {
  const up = Number(to) > Number(from)
  const Icon = up ? ArrowUpIcon : ArrowDownIcon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5",
        up ? "text-emerald-700" : "text-destructive",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {up && percent === 0 ? "+" : ""}
      {formatPercent(percent)}
    </span>
  )
}
