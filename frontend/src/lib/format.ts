// Intl formatters are costly to build, so each one is made once and reused.
const moneyFormats = new Map<string, Intl.NumberFormat>()
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
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

export function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(isoDate))
}

export function formatCount(count: number): string {
  return countFormat.format(count)
}
