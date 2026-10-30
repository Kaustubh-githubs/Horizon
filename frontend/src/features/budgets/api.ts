import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { apiRequest } from "@/lib/api"

// Department budgets (ADR 0020). Amounts are decimal strings, like everywhere (ADR 0006).

export type BudgetStatus = "over" | "near" | "under" | "no_budget"

/** Payroll against a budget; no percentage, status or runway without a budget. */
type Comparison = {
  utilisation_percent: number | null
  status: BudgetStatus
  /** Months of the year the budget covers from 1 January; null without payroll. */
  runway_months: number | null
}

export type DepartmentBudget = Comparison & {
  id: number
  name: string
  headcount: number
  /** Yearly pay of the active staff at today's salaries, in INR. */
  payroll: string
  budget: { id: number; amount: string; lock_version: number } | null
}

/** The departments that have a budget, added up. */
export type BudgetTotal = Comparison & {
  unbudgeted_departments: number
  payroll: string
  budget: string | null
}

export type BudgetOverview = {
  year: number
  /** The currency of every budget and payroll here (INR). */
  currency: string
  rates_as_of: string | null
  excluded_currencies: string[]
  total: BudgetTotal
  departments: DepartmentBudget[]
}

export type SavedBudget = {
  id: number
  department_id: number
  year: number
  amount: string
  currency: string
  lock_version: number
}

/** One entry in a budget's history (ADR 0012): set to `to`, or changed from `from` to `to`. */
export type BudgetAudit = {
  id: number
  action: "create" | "update"
  from: string | null
  to: string | null
  /** Null for changes made outside the app, such as the seed. */
  changed_by: string | null
  created_at: string
}

/** This year's budgets for every department. */
export function useBudgetOverview() {
  return useQuery({
    queryKey: ["budgets", "overview"],
    queryFn: () => apiRequest<BudgetOverview>("/budgets"),
  })
}

/** Who set and changed a budget, newest first. Waits until there's a budget to ask about. */
export function useBudgetAudits(budgetId: number | null) {
  return useQuery({
    queryKey: ["budgets", budgetId, "audits"],
    queryFn: () => apiRequest<BudgetAudit[]>(`/budgets/${budgetId}/audits`),
    enabled: budgetId !== null,
  })
}

/** A change to a budget (with the lock_version it was loaded at), or a new one for this year. */
export type SaveBudgetInput =
  | { id: number; amount: string; lock_version: number }
  | { department_id: number; amount: string }

/** Sets this year's budget, or changes one (with its lock_version, ADR 0017). */
export function useSaveBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (budget: SaveBudgetInput) =>
      "id" in budget
        ? apiRequest<SavedBudget>(`/budgets/${budget.id}`, {
            method: "PATCH",
            body: { amount: budget.amount, lock_version: budget.lock_version },
          })
        : apiRequest<SavedBudget>("/budgets", { method: "POST", body: budget }),
    // Refreshes the overview and any history that's been loaded.
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["budgets"] }),
  })
}
