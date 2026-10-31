import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { type Employee } from "@/features/employees/api"
import { ChangeSalaryDialog } from "@/features/employees/change-salary-dialog"
import { formatMoney } from "@/lib/format"

/**
 * The current salary and (for active employees) a way to change it. Every past change is on the
 * timeline below (ADR 0021).
 */
export function SalaryCard({ employee }: { employee: Employee }) {
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
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">
          {formatMoney(employee.current_salary, employee.current_currency)}
        </p>
        <p className="text-sm text-muted-foreground">
          Annual gross base pay. Past changes are on the timeline.
        </p>
      </CardContent>
    </Card>
  )
}
