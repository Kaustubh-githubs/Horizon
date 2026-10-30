import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { employeeKey, type SalaryReason } from "@/features/employees/api"
import { apiRequest, toQueryString } from "@/lib/api"

// Pay insights (ADR 0019). Amounts are decimal strings, like everywhere (ADR 0006).

export type SegmentBy = "country" | "department" | "job_title" | "tenure"

export type Overview = {
  /** The reporting currency every figure here is converted to (INR). */
  currency: string
  rates_as_of: string | null
  /** Currencies with no exchange rate: their employees are left out of converted figures. */
  excluded_currencies: string[]
  headcount: number
  countries: number
  payroll: string | null
  median: string | null
  mean: string | null
  outlier_count: number
  outlier_threshold: number
}

export type SegmentRow = {
  key: string | number
  label: string
  /** Null only when the row is empty (a tenure band nobody is in). */
  currency: string | null
  headcount: number
  min: string | null
  /** 25th percentile: with p75, the middle half of salaries. */
  p25: string | null
  median: string | null
  p75: string | null
  mean: string | null
  max: string | null
  payroll: string | null
  /** Rows by country only: the spread and payroll converted to INR, for comparing countries. */
  converted?: {
    currency: string
    p25: string | null
    median: string | null
    p75: string | null
    payroll: string | null
  } | null
}

/** Who's counted, beyond the grouping. Each is null when not filtered. */
export type SegmentFiltersApplied = {
  country: { code: string; name: string } | null
  department: { id: number; name: string } | null
  job_title: { id: number; name: string } | null
  tenure: { key: string; label: string } | null
}

/** What the segment card asks for: the grouping, and the filters as the URL holds them. */
export type SegmentQuery = {
  by: SegmentBy
  country?: string
  department_id?: string
  job_title_id?: string
  tenure?: string
}

export type SegmentStats = {
  by: SegmentBy
  filters: SegmentFiltersApplied
  /** The currency of every row, or null when grouped by country, where each row has its own. */
  currency: string | null
  converted: boolean
  rates_as_of: string | null
  excluded_currencies: string[]
  rows: SegmentRow[]
}

export type Outlier = {
  employee: { id: number; employee_code: string; full_name: string }
  country: { code: string; name: string }
  job_title: { id: number; name: string }
  salary: string
  currency: string
  peer_median: string
  peer_count: number
  /** Negative when paid below the peers' median. */
  deviation_percent: number
}

export type OutlierFilters = {
  threshold: string
  direction: string
  country?: string
  page?: string
}

export type PayPosition = {
  flagged: boolean
  enough_peers: boolean
  direction: "below" | "above" | null
  deviation_percent: number | null
  peer_median: string | null
  peer_count: number
  threshold: number
  currency: string
  job_title: string
  country: string
}

export function useOverview() {
  return useQuery({
    queryKey: ["insights", "overview"],
    queryFn: () => apiRequest<Overview>("/insights/overview"),
  })
}

export function useSegments(query: SegmentQuery) {
  return useQuery({
    queryKey: ["insights", "segments", query],
    queryFn: () =>
      apiRequest<SegmentStats>(`/insights/segments?${toQueryString(query)}`),
    placeholderData: keepPreviousData,
  })
}

/** One reason's salary changes in the last 12 months (ADR 0019). */
export type PayChangeFigures = {
  count: number
  average_percent: number | null
  /** What the changes added to yearly pay, in INR; negative if they lowered it. */
  yearly_cost: string | null
}

export type PayChanges = {
  since: string
  currency: string
  rates_as_of: string | null
  excluded_currencies: string[]
  rows: (PayChangeFigures & { reason: Exclude<SalaryReason, "hire"> })[]
  total: PayChangeFigures
}

export function usePayChanges() {
  return useQuery({
    queryKey: ["insights", "pay_changes"],
    queryFn: () => apiRequest<PayChanges>("/insights/pay_changes"),
  })
}

export function useOutliers(filters: OutlierFilters) {
  return useQuery({
    queryKey: ["insights", "outliers", filters],
    queryFn: () =>
      apiRequest<{
        data: Outlier[]
        meta: {
          page: number
          per_page: number
          total_count: number
          total_pages: number
          threshold: number
        }
      }>(`/insights/outliers?${toQueryString(filters)}`),
    placeholderData: keepPreviousData,
  })
}

/** Whether an employee is a ★ outlier, for their profile. Refreshed with the employee. */
export function usePayPosition(employeeId: number, enabled: boolean) {
  return useQuery({
    queryKey: [...employeeKey(employeeId), "pay_position"],
    queryFn: () =>
      apiRequest<PayPosition>(`/employees/${employeeId}/pay_position`),
    enabled,
  })
}
