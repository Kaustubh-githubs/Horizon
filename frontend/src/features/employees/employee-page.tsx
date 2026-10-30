import { PencilIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Link, useParams } from "react-router"

import { BackLink } from "@/components/back-link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEmployee } from "@/features/employees/api"
import { EmployeeLoadState } from "@/features/employees/employee-load-state"
import { EndEmploymentDialog } from "@/features/employees/end-employment-dialog"
import { SalaryCard } from "@/features/employees/salary-card"
import { STATUS_LABELS } from "@/features/employees/status"
import { formatDate } from "@/lib/format"

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export function EmployeePage() {
  const { id = "" } = useParams()
  const employeeQuery = useEmployee(id)

  const loadState = <EmployeeLoadState queries={[employeeQuery]} />
  if (!employeeQuery.data) return loadState

  const employee = employeeQuery.data
  const active = employee.status === "active"

  return (
    <section className="flex max-w-3xl flex-col gap-4">
      <BackLink to="/employees">Employees</BackLink>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">
            {employee.full_name}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{employee.employee_code}</span>
            <Badge variant={active ? "secondary" : "outline"}>
              {STATUS_LABELS[employee.status]}
            </Badge>
          </div>
        </div>

        {active && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={`/employees/${employee.id}/edit`}>
                <PencilIcon data-icon="inline-start" />
                Edit
              </Link>
            </Button>
            <EndEmploymentDialog employee={employee} />
          </div>
        )}
      </div>

      {!active && employee.terminated_on && (
        <p className="rounded-lg border bg-muted/40 p-4 text-sm">
          Former employee. Their last working day was{" "}
          {formatDate(employee.terminated_on)}. The record is kept for reference
          and can&apos;t be changed.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Work email">{employee.email}</Detail>
            <Detail label="Country">{employee.country.name}</Detail>
            <Detail label="Department">{employee.department.name}</Detail>
            <Detail label="Job title">{employee.job_title.name}</Detail>
            <Detail label="Hire date">{formatDate(employee.hire_date)}</Detail>
          </dl>
        </CardContent>
      </Card>

      <SalaryCard employee={employee} />
    </section>
  )
}
