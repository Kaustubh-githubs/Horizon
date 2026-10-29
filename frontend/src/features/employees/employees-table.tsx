import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Employee } from "@/features/employees/api"
import { formatDate, formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"

type SortableColumn =
  "employee_code" | "full_name" | "hire_date" | "current_salary"

function SortHeader({
  column,
  label,
  sort,
  onSort,
  className,
}: {
  column: SortableColumn
  label: string
  sort: string | undefined
  onSort: (sort: string) => void
  className?: string
}) {
  const current = sort ?? "full_name"
  const direction =
    current === column ? "asc" : current === `-${column}` ? "desc" : null
  const Icon =
    direction === "asc"
      ? ArrowUpIcon
      : direction === "desc"
        ? ArrowDownIcon
        : ArrowUpDownIcon

  return (
    <TableHead
      className={className}
      aria-sort={
        direction === "asc"
          ? "ascending"
          : direction === "desc"
            ? "descending"
            : "none"
      }
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => onSort(direction === "asc" ? `-${column}` : column)}
      >
        {label}
        <Icon
          className={cn("size-3.5", !direction && "text-muted-foreground/50")}
        />
      </button>
    </TableHead>
  )
}

const COLUMN_COUNT = 7

export function EmployeesTable({
  employees,
  isLoading,
  isRefreshing,
  sort,
  onSort,
}: {
  employees: Employee[]
  isLoading: boolean
  isRefreshing: boolean
  sort: string | undefined
  onSort: (sort: string) => void
}) {
  return (
    <div
      className={cn(
        "rounded-lg border transition-opacity",
        isRefreshing && "opacity-60",
      )}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <SortHeader
              column="employee_code"
              label="Code"
              sort={sort}
              onSort={onSort}
            />
            <SortHeader
              column="full_name"
              label="Name"
              sort={sort}
              onSort={onSort}
            />
            <TableHead>Job title</TableHead>
            <TableHead>Country</TableHead>
            <SortHeader
              column="hire_date"
              label="Hired"
              sort={sort}
              onSort={onSort}
            />
            <SortHeader
              column="current_salary"
              label="Salary"
              sort={sort}
              onSort={onSort}
              className="text-right"
            />
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 8 }, (_, row) => (
                <TableRow key={row}>
                  {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
                    <TableCell key={cell}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {employee.employee_code}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{employee.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {employee.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{employee.job_title.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {employee.department.name}
                    </div>
                  </TableCell>
                  <TableCell>{employee.country.name}</TableCell>
                  <TableCell>{formatDate(employee.hire_date)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(
                      employee.current_salary,
                      employee.current_currency,
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        employee.status === "active" ? "secondary" : "outline"
                      }
                    >
                      {employee.status === "active" ? "Active" : "Terminated"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  )
}
