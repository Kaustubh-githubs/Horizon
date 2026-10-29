import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { apiRequest } from "@/lib/api"

export type EmployeeStatus = "active" | "terminated"

export type Employee = {
  id: number
  employee_code: string
  full_name: string
  email: string
  hire_date: string
  status: EmployeeStatus
  terminated_on: string | null
  country: { code: string; name: string }
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
  countries: { code: string; name: string; currency_code: string }[]
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
  const query = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  ).toString()

  return useQuery({
    queryKey: ["employees", filters],
    queryFn: () =>
      apiRequest<{ data: Employee[]; meta: PageMeta }>(`/employees?${query}`),
    // Keep showing the current page while the next one loads, instead of flashing empty.
    placeholderData: keepPreviousData,
  })
}

export function useLookups() {
  return useQuery({
    queryKey: ["lookups"],
    queryFn: () => apiRequest<Lookups>("/lookups"),
    staleTime: Infinity, // countries, departments and titles rarely change
  })
}
