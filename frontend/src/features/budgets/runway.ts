const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

/**
 * How long a budget lasts at today's payroll (ADR 0020): `months` is how many months of the year
 * it covers from 1 January, so 10.4 runs out during November and 12 or more covers the year.
 */
export function runwayText(months: number | null): string {
  if (months === null) return "No payroll yet"
  if (months >= 12) return "Covers the year"
  return `Runs out in ${MONTHS[Math.floor(months)]}`
}

/** The status a budget would have: over above 100%, near the limit from 90%, under below. */
export function statusFor(percent: number): "over" | "near" | "under" {
  if (percent > 100) return "over"
  if (percent >= 90) return "near"
  return "under"
}
