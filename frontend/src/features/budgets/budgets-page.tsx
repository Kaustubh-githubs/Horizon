import { useState } from "react"

import { AnimatedNumber } from "@/components/animated-number"
import { LoadError } from "@/components/load-error"
import {
  StatTileSkeleton,
  TableSkeleton,
  TextLine,
} from "@/components/skeletons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useBudgetOverview,
  type BudgetOverview,
  type BudgetStatus,
} from "@/features/budgets/api"
import { BudgetHistoryDialog } from "@/features/budgets/budget-history-dialog"
import { BudgetStatusLabel } from "@/features/budgets/budget-status"
import { runwayText } from "@/features/budgets/runway"
import { SetBudgetDialog } from "@/features/budgets/set-budget-dialog"
import {
  compactMoney,
  formatCount,
  formatDate,
  formatMoney,
  formatMoneyCompact,
} from "@/lib/format"
import { cn } from "@/lib/utils"

type Opened = { departmentId: number; dialog: "edit" | "history" }

/**
 * Department budgets (ADR 0020): this year's budget for each department against today's payroll,
 * in INR, with a status, the runway and the headcount, plus the combined budget on top.
 */
export function BudgetsPage() {
  const overview = useBudgetOverview()
  const data = overview.data
  // Which dialog is open, and for whom. The department comes from the latest data, so payroll and
  // history stay current; the set-budget form keeps the budget version it opened with (ADR 0017).
  const [opened, setOpened] = useState<Opened | null>(null)
  const department =
    data?.departments.find((d) => d.id === opened?.departmentId) ?? null
  const close = () => setOpened(null)

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Budgets</h1>
        <p className="text-sm text-muted-foreground">
          Each department&apos;s yearly pay budget
          {data ? ` for ${data.year}` : ""}, against today&apos;s payroll.
        </p>
      </div>

      {overview.isError ? (
        <LoadError what="the budgets" onRetry={() => void overview.refetch()} />
      ) : !data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <StatTileSkeleton key={index} />
            ))}
          </div>
          <Card aria-hidden="true">
            <CardHeader>
              <TextLine className="w-28" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <TextLine className="w-3/4" />
              <TableSkeleton columns={7} rows={8} />
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Summary overview={data} />
          <Card>
            <CardHeader>
              <CardTitle>Departments</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Payroll is the yearly pay of active staff at today&apos;s
                salaries, in {data.currency}
                {data.rates_as_of
                  ? ` at rates as of ${formatDate(data.rates_as_of)}`
                  : ""}
                . Over budget means above 100% of the budget; near the limit,
                90–100%. Runway is how far into the year the budget lasts.
                {data.excluded_currencies.length > 0 &&
                  ` Left out of payroll (no exchange rate): ${data.excluded_currencies.join(", ")}.`}
              </p>
              <DepartmentsTable overview={data} onOpen={setOpened} />
            </CardContent>
          </Card>

          <SetBudgetDialog
            target={
              opened?.dialog === "edit" && department
                ? { year: data.year, currency: data.currency, department }
                : null
            }
            onClose={close}
          />
          <BudgetHistoryDialog
            department={opened?.dialog === "history" ? department : null}
            year={data.year}
            currency={data.currency}
            onClose={close}
          />
        </>
      )}
    </section>
  )
}

/** The combined budget, and how many departments are over, near or under theirs. */
function Summary({ overview }: { overview: BudgetOverview }) {
  const { total, currency } = overview
  const count = (status: BudgetStatus) =>
    overview.departments.filter((d) => d.status === status).length

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="brand-edge">
        <CardContent className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Combined budget</p>
          {total.budget ? (
            <>
              <span
                title={formatMoney(total.budget, currency)}
                className="text-3xl font-semibold tabular-nums"
              >
                <AnimatedNumber
                  id="budgets.combined"
                  {...compactMoney(total.budget, currency)}
                />
              </span>
              <BudgetStatusLabel
                status={total.status}
                percent={total.utilisation_percent}
              />
              <p className="text-sm text-muted-foreground">
                <Money amount={total.payroll} currency={currency} /> payroll ·{" "}
                {runwayText(total.runway_months)}
              </p>
            </>
          ) : (
            <p className="text-3xl font-semibold">None set</p>
          )}
          {total.unbudgeted_departments > 0 && (
            <p className="text-xs text-muted-foreground">
              Leaves out {formatCount(total.unbudgeted_departments)}{" "}
              {total.unbudgeted_departments === 1
                ? "department"
                : "departments"}{" "}
              without a budget.
            </p>
          )}
        </CardContent>
      </Card>
      {(["over", "near", "under"] as const).map((status) => (
        <Card key={status} className="brand-edge">
          <CardContent className="flex flex-col gap-1">
            <BudgetStatusLabel status={status} />
            <p className="text-3xl font-semibold tabular-nums">
              <AnimatedNumber id={`budgets.${status}`} value={count(status)} />
            </p>
            <p className="text-sm text-muted-foreground">
              {count(status) === 1 ? "department" : "departments"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DepartmentsTable({
  overview,
  onOpen,
}: {
  overview: BudgetOverview
  onOpen: (opened: Opened) => void
}) {
  const { currency } = overview

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Department</TableHead>
          <TableHead className="text-right">People</TableHead>
          <TableHead className="text-right">Payroll</TableHead>
          <TableHead className="text-right">Budget</TableHead>
          <TableHead>Used</TableHead>
          <TableHead>Runway</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {overview.departments.map((department) => (
          <TableRow key={department.id}>
            <TableCell className="font-medium">{department.name}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCount(department.headcount)}
            </TableCell>
            <TableCell className="text-right">
              <Money amount={department.payroll} currency={currency} />
            </TableCell>
            <TableCell className="text-right">
              {department.budget ? (
                <Money amount={department.budget.amount} currency={currency} />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              <BudgetStatusLabel
                status={department.status}
                percent={department.utilisation_percent}
              />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {department.budget ? runwayText(department.runway_months) : "—"}
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-2">
                {department.budget && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`${department.name}'s budget history`}
                    onClick={() =>
                      onOpen({ departmentId: department.id, dialog: "history" })
                    }
                  >
                    History
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`${department.budget ? "Change" : "Set"} ${department.name}'s budget`}
                  onClick={() =>
                    onOpen({ departmentId: department.id, dialog: "edit" })
                  }
                >
                  {department.budget ? "Change" : "Set budget"}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Short (₹3.5 Cr) on screen, exact on hover. */
function Money({
  amount,
  currency,
  className,
}: {
  amount: string
  currency: string
  className?: string
}) {
  return (
    <span
      title={formatMoney(amount, currency)}
      className={cn("tabular-nums", className)}
    >
      {formatMoneyCompact(amount, currency)}
    </span>
  )
}
