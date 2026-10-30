/**
 * Today as an ISO date (2026-10-30), by the UTC calendar. The server keeps one clock, UTC, for
 * every "today or earlier" rule, so the browser offers the same latest date (ADR 0017).
 */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
