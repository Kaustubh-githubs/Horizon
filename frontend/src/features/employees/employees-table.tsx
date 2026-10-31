import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react"
import { useEffect, useRef, type MouseEvent } from "react"
import { Link, useNavigate } from "react-router"

import { Badge } from "@/components/ui/badge"
import { TextLine } from "@/components/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { usePrefetchEmployee, type Employee } from "@/features/employees/api"
import { STATUS_LABELS } from "@/features/employees/status"
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

const HOVER_INTENT_MS = 100

// Columns give way as the table narrows (container queries on its box, so the sidebar and a phone
// are handled alike): first the code (the name already identifies the person), then the hire
// date, the status, the job title and the country. The name and the salary always show, so a
// phone lists who earns what without scrolling sideways.
const SHOWN_FROM = {
  country: "hidden @min-[26rem]:table-cell",
  jobTitle: "hidden @min-[41rem]:table-cell",
  status: "hidden @min-[45rem]:table-cell",
  hired: "hidden @min-[52rem]:table-cell",
  code: "hidden @min-[57rem]:table-cell",
}

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
  const navigate = useNavigate()
  const prefetch = usePrefetchEmployee()
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Only a pointer that rests on a row prefetches, not one passing over the list on its way.
  const startPrefetch = (id: number) => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => prefetch(id), HOVER_INTENT_MS)
  }
  const cancelPrefetch = () => clearTimeout(hoverTimer.current)
  useEffect(() => cancelPrefetch, [])

  // The whole row opens the profile. The name stays a real link, for the keyboard, screen
  // readers and opening in a new tab; clicks on it (or while selecting text) are left alone.
  const openRow = (event: MouseEvent, id: number) => {
    const target = event.target as HTMLElement
    if (target.closest("a, button") || window.getSelection()?.toString()) return
    const to = `/employees/${id}`
    if (event.metaKey || event.ctrlKey) window.open(to, "_blank", "noopener")
    else void navigate(to)
  }

  return (
    <div
      className={cn(
        "@container rounded-lg border transition-opacity",
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
              className={SHOWN_FROM.code}
            />
            <SortHeader
              column="full_name"
              label="Name"
              sort={sort}
              onSort={onSort}
            />
            <TableHead className={SHOWN_FROM.jobTitle}>Job title</TableHead>
            <TableHead className={SHOWN_FROM.country}>Country</TableHead>
            <SortHeader
              column="hire_date"
              label="Hired"
              sort={sort}
              onSort={onSort}
              className={SHOWN_FROM.hired}
            />
            <SortHeader
              column="current_salary"
              label="Salary"
              sort={sort}
              onSort={onSort}
              className="text-right"
            />
            <TableHead className={SHOWN_FROM.status}>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? // Shaped like real rows (name and email, title and department on two lines), so
              // the table doesn't jump when they arrive.
              Array.from({ length: 10 }, (_, row) => (
                <TableRow key={row} aria-hidden="true">
                  <TableCell className={SHOWN_FROM.code}>
                    <TextLine className="w-20" />
                  </TableCell>
                  <TableCell>
                    <TextLine className="w-36" />
                    <Skeleton className="mt-1 h-3 w-48" />
                  </TableCell>
                  <TableCell className={SHOWN_FROM.jobTitle}>
                    <TextLine className="w-40" />
                    <Skeleton className="mt-1 h-3 w-24" />
                  </TableCell>
                  <TableCell className={SHOWN_FROM.country}>
                    <TextLine className="w-24" />
                  </TableCell>
                  <TableCell className={SHOWN_FROM.hired}>
                    <TextLine className="w-24" />
                  </TableCell>
                  <TableCell>
                    <TextLine className="ml-auto w-28" />
                  </TableCell>
                  <TableCell className={SHOWN_FROM.status}>
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </TableCell>
                </TableRow>
              ))
            : employees.map((employee) => (
                <TableRow
                  key={employee.id}
                  className="cursor-pointer"
                  onClick={(event) => openRow(event, employee.id)}
                  onPointerEnter={() => startPrefetch(employee.id)}
                  onPointerLeave={cancelPrefetch}
                >
                  <TableCell
                    className={cn(
                      "font-mono text-xs text-muted-foreground",
                      SHOWN_FROM.code,
                    )}
                  >
                    {employee.employee_code}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/employees/${employee.id}`}
                      className="font-medium hover:text-brand-strong hover:underline"
                    >
                      {employee.full_name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {employee.email}
                    </div>
                  </TableCell>
                  <TableCell className={SHOWN_FROM.jobTitle}>
                    <div>{employee.job_title.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {employee.department.name}
                    </div>
                  </TableCell>
                  <TableCell className={SHOWN_FROM.country}>
                    {employee.country.name}
                  </TableCell>
                  <TableCell className={SHOWN_FROM.hired}>
                    {formatDate(employee.hire_date)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(
                      employee.current_salary,
                      employee.current_currency,
                    )}
                  </TableCell>
                  <TableCell className={SHOWN_FROM.status}>
                    <Badge
                      variant={
                        employee.status === "active" ? "secondary" : "outline"
                      }
                    >
                      {STATUS_LABELS[employee.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  )
}
