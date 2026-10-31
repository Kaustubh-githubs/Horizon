import type { EmployeeStatus, SalaryReason } from "@/features/employees/api"
import { REASON_LABELS } from "@/features/employees/salary"
import { STATUS_LABELS } from "@/features/employees/status"
import { formatDate, formatMoney } from "@/lib/format"

// How a changed value reads in the timeline and the audit log (ADR 0021). Field names are the
// API's; id columns arrive without "_id", already as names.

const FIELD_LABELS: Record<string, string> = {
  full_name: "Name",
  email: "Work email",
  country: "Country",
  department: "Department",
  job_title: "Job title",
  hire_date: "Hire date",
  status: "Status",
  terminated_on: "Last working day",
  salary: "Salary",
  current_salary: "Current salary",
  current_currency: "Currency",
  amount: "Amount",
  currency: "Currency",
  effective_from: "Effective from",
  reason: "Reason",
}
const MONEY_FIELDS = new Set(["salary", "current_salary", "amount"])
const DATE_FIELDS = new Set(["hire_date", "terminated_on", "effective_from"])

/** The label for a field, or the field's own name for one we don't know yet. */
export function fieldLabel(field: string): string {
  return field in FIELD_LABELS ? FIELD_LABELS[field] : field
}

/** A value as shown on screen, in the employee's currency for money; "—" when there's none. */
export function formatFieldValue(
  field: string,
  value: string | null,
  currency: string,
): string {
  if (value === null) return "—"
  if (MONEY_FIELDS.has(field)) return formatMoney(value, currency)
  if (DATE_FIELDS.has(field)) return formatDate(value)
  if (field === "status" && value in STATUS_LABELS)
    return STATUS_LABELS[value as EmployeeStatus]
  if (field === "reason" && value in REASON_LABELS)
    return REASON_LABELS[value as SalaryReason]
  return value
}
