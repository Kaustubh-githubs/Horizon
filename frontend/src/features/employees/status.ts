import type { EmployeeStatus } from "@/features/employees/api"

/**
 * How a status reads on screen. The API and database say `terminated` (the usual HR data
 * term), but the UI talks about ending someone's employment and former employees (ADR 0017).
 */
export const STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: "Active",
  terminated: "Former",
}
