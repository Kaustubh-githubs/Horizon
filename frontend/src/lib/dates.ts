/** The browser's time zone (e.g. "Asia/Kolkata"). Sent with every request, see apiRequest. */
export const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

/**
 * Today as an ISO date (2026-10-30) on the user's own calendar. The API checks "today or
 * earlier" in the time zone the app sends, so both sides agree on what today is (ADR 0017).
 */
export function todayIso(): string {
  const now = new Date()
  const pad = (part: number) => String(part).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
