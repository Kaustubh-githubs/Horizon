import type { SalaryReason } from "@/features/employees/api"

export const REASON_LABELS: Record<SalaryReason, string> = {
  hire: "Hired",
  annual_raise: "Annual raise",
  promotion: "Promotion",
  market_adjustment: "Market adjustment",
  correction: "Correction",
}

/** The reasons HR can pick for a change. `hire` is only used when an employee is added. */
export const CHANGE_REASONS = [
  "annual_raise",
  "promotion",
  "market_adjustment",
  "correction",
] as const

/** Above this, the change dialog warns (ADR 0018). It doesn't block saving. */
export const BIG_CHANGE_PERCENT = 50

/** % difference from `from` to `to`, e.g. 1000 → 1100 is 10. Amounts are decimal strings. */
export function percentChange(from: string, to: string): number {
  return ((Number(to) - Number(from)) / Number(from)) * 100
}

export function formatPercent(percent: number): string {
  const rounded = Math.round(percent * 10) / 10
  return `${rounded > 0 ? "+" : ""}${rounded}%`
}
