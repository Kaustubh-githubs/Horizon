// Intl formatters are costly to build, so each one is made once and reused.
const moneyFormats = new Map<string, Intl.NumberFormat>()
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})
// No timeZone option: the browser's own zone, so a UTC timestamp shows in the user's local time.
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})
const countFormat = new Intl.NumberFormat("en")

// Money is always shown with its currency, never as a bare number (docs/requirements.md).
// It uses the currency's own decimals (2 for EUR, 0 for JPY), so cents are never rounded away.
export function formatMoney(amount: string, currency: string): string {
  let format = moneyFormats.get(currency)
  if (!format) {
    format = new Intl.NumberFormat("en", { style: "currency", currency })
    moneyFormats.set(currency, format)
  }
  return format.format(Number(amount))
}

const compactMoneyFormats = new Map<string, Intl.NumberFormat>()

/** A large amount, shortened for a headline or an axis: "₹60B", "$1.2M". */
export function formatMoneyCompact(amount: string, currency: string): string {
  let format = compactMoneyFormats.get(currency)
  if (!format) {
    format = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    })
    compactMoneyFormats.set(currency, format)
  }
  return format.format(Number(amount))
}

/** A calendar date (hire date, effective date). It has no time zone, so it's shown as stored. */
export function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(isoDate))
}

/** A moment the API stores in UTC (e.g. when a change was recorded), in the user's local time. */
export function formatDateTime(isoTimestamp: string): string {
  return dateTimeFormat.format(new Date(isoTimestamp))
}

export function formatCount(count: number): string {
  return countFormat.format(count)
}
