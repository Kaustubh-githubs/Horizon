import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { employeeKey, type SalaryReason } from "@/features/employees/api"
import { apiRequest, toQueryString } from "@/lib/api"

// Pay insights (ADR 0019). Amounts are decimal strings, like everywhere (ADR 0006).

export type SegmentBy = "country" | "department" | "job_title" | "tenure"

/** The page's filters, as the URL holds them. Every part of the page takes them (ADR 0019). */
export type InsightFilters = {
  country?: string
  department_id?: string
  job_title_id?: string
  tenure?: string
}

/** Who's counted, as the API applied it. Each is null when not filtered. */
export type FiltersApplied = {
  country: { code: string; name: string } | null
  department: { id: number; name: string } | null
  job_title: { id: number; name: string } | null
  tenure: { key: string; label: string } | null
}

export type Overview = {
  filters: FiltersApplied
  /** One country's own currency when filtered to it; otherwise INR, everything converted. */
  currency: string
  converted: boolean
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

/** What the segment card asks for: the grouping, and the page's filters. */
export type SegmentQuery = InsightFilters & { by: SegmentBy }

export type SegmentStats = {
  by: SegmentBy
  filters: FiltersApplied
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

/** The page's filters choose whose stars are listed; peers are still the whole role and country. */
export type OutlierFilters = InsightFilters & {
  threshold: string
  direction: string
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

/** `threshold` is the ★ list's, so the ★ tile counts the same people the list shows. */
export function useOverview(filters: InsightFilters, threshold: string) {
  return useQuery({
    queryKey: ["insights", "overview", filters, threshold],
    queryFn: () =>
      apiRequest<Overview>(
        `/insights/overview?${toQueryString({ ...filters, threshold })}`,
      ),
    placeholderData: keepPreviousData,
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
  filters: FiltersApplied
  /** One country's own currency when filtered to it; otherwise INR, converted. */
  currency: string
  converted: boolean
  rates_as_of: string | null
  excluded_currencies: string[]
  rows: (PayChangeFigures & { reason: Exclude<SalaryReason, "hire"> })[]
  total: PayChangeFigures
}

export function usePayChanges(filters: InsightFilters) {
  return useQuery({
    queryKey: ["insights", "pay_changes", filters],
    queryFn: () =>
      apiRequest<PayChanges>(`/insights/pay_changes?${toQueryString(filters)}`),
    placeholderData: keepPreviousData,
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
