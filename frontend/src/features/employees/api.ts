import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { apiRequest, toQueryString } from "@/lib/api"

export type EmployeeStatus = "active" | "terminated"

export type Employee = {
  id: number
  employee_code: string
  full_name: string
  email: string
  hire_date: string
  status: EmployeeStatus
  terminated_on: string | null
  country: { id: number; code: string; name: string }
  department: { id: number; name: string }
  job_title: { id: number; name: string }
  /** A decimal string, never a JS number, so no float rounding (ADR 0006). */
  current_salary: string
  current_currency: string
  lock_version: number
}

export type PageMeta = {
  page: number
  per_page: number
  total_count: number
  total_pages: number
}

export type Lookups = {
  countries: { id: number; code: string; name: string; currency_code: string }[]
  departments: { id: number; name: string }[]
  job_titles: { id: number; name: string }[]
}

/** Directory filters, exactly as the API accepts them. Empty values are left out. */
export type DirectoryFilters = {
  q?: string
  country?: string
  department_id?: string
  job_title_id?: string
  status?: string
  sort?: string
  page?: string
}

export function useEmployees(filters: DirectoryFilters) {
  const query = toQueryString(filters)

  return useQuery({
    queryKey: ["employees", filters],
    queryFn: () =>
      apiRequest<{ data: Employee[]; meta: PageMeta }>(`/employees?${query}`),
    // Keep showing the current page while the next one loads, instead of flashing empty.
    placeholderData: keepPreviousData,
  })
}

/** Counts for the cards above the directory, for the same people as the list. */
export type DirectorySummary = {
  total: number
  countries: { code: string; name: string; count: number }[]
  departments: { id: number; name: string; count: number }[]
}

/** Follows the list's search and filters; sorting and paging don't change who's counted. */
export function useDirectorySummary(filters: DirectoryFilters) {
  const who = {
    q: filters.q,
    country: filters.country,
    department_id: filters.department_id,
    job_title_id: filters.job_title_id,
    status: filters.status,
  }
  return useQuery({
    // Under "employees", so anything that refreshes the list refreshes the cards too.
    queryKey: ["employees", "summary", who],
    queryFn: () =>
      apiRequest<DirectorySummary>(`/employees/summary?${toQueryString(who)}`),
    placeholderData: keepPreviousData,
  })
}

export const employeeKey = (id: number | string) => ["employee", String(id)]

export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKey(id),
    queryFn: () => apiRequest<Employee>(`/employees/${id}`),
  })
}

/** What the add form sends. Ids and the salary are strings, as the form holds them. */
export type NewEmployee = {
  full_name: string
  email: string
  hire_date: string
  country_id: string
  department_id: string
  job_title_id: string
  current_salary: string
}

/** Only these can change after creation (ADR 0017). lock_version catches conflicting edits. */
export type EmployeeChanges = Pick<
  NewEmployee,
  "full_name" | "email" | "department_id" | "job_title_id"
> & { lock_version: number }

export type Termination = { terminated_on: string; lock_version: number }

// After any change: store the fresh employee, and refetch directory pages so they show it too.
function useEmployeeSaved() {
  const queryClient = useQueryClient()
  return (employee: Employee) => {
    queryClient.setQueryData(employeeKey(employee.id), employee)
    void queryClient.invalidateQueries({ queryKey: ["employees"] })
  }
}

export function useCreateEmployee() {
  const onSaved = useEmployeeSaved()
  return useMutation({
    mutationFn: (employee: NewEmployee) =>
      apiRequest<Employee>("/employees", { method: "POST", body: employee }),
    onSuccess: onSaved,
  })
}

export function useUpdateEmployee(id: number) {
  const onSaved = useEmployeeSaved()
  return useMutation({
    mutationFn: (changes: EmployeeChanges) =>
      apiRequest<Employee>(`/employees/${id}`, {
        method: "PATCH",
        body: changes,
      }),
    onSuccess: onSaved,
  })
}

/** "End employment" in the UI; the API calls it a termination (ADR 0017). */
export function useEndEmployment(id: number) {
  const onSaved = useEmployeeSaved()
  return useMutation({
    mutationFn: (termination: Termination) =>
      apiRequest<Employee>(`/employees/${id}/termination`, {
        method: "POST",
        body: termination,
      }),
    onSuccess: onSaved,
  })
}

export type SalaryReason =
  "hire" | "annual_raise" | "promotion" | "market_adjustment" | "correction"

export type SalaryRevision = {
  id: number
  /** Decimal strings, like every amount (ADR 0006). */
  amount: string
  currency: string
  effective_from: string
  reason: SalaryReason
  recorded_at: string
  previous_amount: string | null
  change_percent: number | null
}

/** What peers (same country and job title, active) earn (ADR 0018). */
export type PayComparison = {
  country: { code: string; name: string }
  job_title: { id: number; name: string }
  currency: string
  peer_count: number
  average: string | null
  median: string | null
}

export type SalaryChange = {
  amount: string
  reason: Exclude<SalaryReason, "hire">
  /** Only for a promotion: the new job title. */
  job_title_id?: string
  lock_version: number
}

export function useSalaryHistory(employeeId: number) {
  return useQuery({
    queryKey: [...employeeKey(employeeId), "salary_revisions"],
    queryFn: () =>
      apiRequest<{ data: SalaryRevision[] }>(
        `/employees/${employeeId}/salary_revisions`,
      ),
  })
}

/** Peer pay for the employee's title, or for `jobTitleId` (e.g. the title of a promotion). */
export function usePayComparison(
  employeeId: number,
  jobTitleId: string | undefined,
  enabled: boolean,
) {
  const query = jobTitleId ? `?job_title_id=${jobTitleId}` : ""
  return useQuery({
    queryKey: [...employeeKey(employeeId), "pay_comparison", jobTitleId ?? ""],
    queryFn: () =>
      apiRequest<PayComparison>(
        `/employees/${employeeId}/pay_comparison${query}`,
      ),
    enabled,
  })
}

export function useChangeSalary(employeeId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (change: SalaryChange) =>
      apiRequest<SalaryRevision>(`/employees/${employeeId}/salary_revisions`, {
        method: "POST",
        body: change,
      }),
    // The employee (current salary, title, lock_version), their history and peer figures all
    // changed, and so may directory pages.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: employeeKey(employeeId) })
      void queryClient.invalidateQueries({ queryKey: ["employees"] })
    },
  })
}

export function useLookups() {
  return useQuery({
    queryKey: ["lookups"],
    queryFn: () => apiRequest<Lookups>("/lookups"),
    staleTime: Infinity, // countries, departments and titles rarely change
  })
}
