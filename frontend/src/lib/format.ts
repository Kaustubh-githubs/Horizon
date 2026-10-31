// Intl formatters are costly to build, so each one is made once and reused.
const moneyFormats = new Map<string, Intl.NumberFormat>()
// Dates read "8 Sep 2022", as the API writes them in its messages (Date::DATE_FORMATS[:readable]).
// Intl's en-GB short month for September is "Sept", so the month names are spelled out here.
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]
// No timeZone option: the browser's own zone, so a UTC timestamp shows in the user's local time.
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
})
const countFormat = new Intl.NumberFormat("en")

// Each currency is written the way its readers expect: rupees with Indian digit grouping
// (₹53,07,247.34), everything else in plain English formatting.
const MONEY_LOCALES: Record<string, string> = { INR: "en-IN" }

// Money is always shown with its currency, never as a bare number (docs/requirements.md).
// It uses the currency's own decimals (2 for EUR, 0 for JPY), so cents are never rounded away.
export function formatMoney(amount: string, currency: string): string {
  let format = moneyFormats.get(currency)
  if (!format) {
    format = new Intl.NumberFormat(MONEY_LOCALES[currency] ?? "en", {
      style: "currency",
      currency,
    })
    moneyFormats.set(currency, format)
  }
  return format.format(Number(amount))
}

const wholeMoneyFormats = new Map<string, Intl.NumberFormat>()

/**
 * Money rounded to whole units (₹30,40,176), for figures that only indicate, like a peer
 * average: the paise are noise there. Amounts that are recorded keep `formatMoney`.
 */
export function formatMoneyWhole(amount: string, currency: string): string {
  let format = wholeMoneyFormats.get(currency)
  if (!format) {
    format = new Intl.NumberFormat(MONEY_LOCALES[currency] ?? "en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    })
    wholeMoneyFormats.set(currency, format)
  }
  return format.format(Number(amount))
}

const LAKH = 1e5
const CRORE = 1e7
const numberFormats = new Map<string, Intl.NumberFormat>()
const numberFormat = (locales: string, options: NumberOptions) => {
  const key = `${locales} ${JSON.stringify(options)}`
  let format = numberFormats.get(key)
  if (!format) {
    format = new Intl.NumberFormat(locales, options)
    numberFormats.set(key, format)
  }
  return format
}

/**
 * How a compact amount is written: a number, how to format it, and what goes around it. The plain
 * text (`formatMoneyCompact`) and the animated headline numbers both use it, so they read the same.
 *
 * Rupees are in lakh and crore, as HR in India reads them: "₹53.07 L", "₹334.88 Cr",
 * "₹6,021.56 Cr". Built by hand because Intl's Indian compact form writes ₹6,021 crore as
 * "₹6.02KCr". Under a lakh the amount is written out ("₹85,000"). Other currencies use Intl's
 * compact form ("$1.2M").
 */
export type CompactMoney = {
  value: number
  prefix: string
  suffix: string
  locales: string
  format: NumberOptions
}

/** Intl's number options, without the notations an animated number can't show. */
export type NumberOptions = Omit<Intl.NumberFormatOptions, "notation"> & {
  notation?: "standard" | "compact"
}

export function compactMoney(amount: string, currency: string): CompactMoney {
  const value = Number(amount)
  if (currency !== "INR")
    return {
      value,
      prefix: "",
      suffix: "",
      locales: "en",
      format: {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 1,
      },
    }

  const size = Math.abs(value)
  const rupees = (scaled: number, suffix: string, fractionDigits: number) => ({
    value: scaled,
    prefix: `${value < 0 ? "-" : ""}₹`,
    suffix,
    locales: "en-IN",
    format: { maximumFractionDigits: fractionDigits },
  })
  if (size >= CRORE) return rupees(size / CRORE, " Cr", 2)
  if (size >= LAKH) return rupees(size / LAKH, " L", 2)
  return rupees(size, "", 0)
}

/** A number written with the given locale and options, from a cached formatter. */
export function formatNumber(
  value: number,
  locales: string,
  options: NumberOptions,
): string {
  return numberFormat(locales, options).format(value)
}

/** A large amount, shortened for a headline or an axis: "₹334.88 Cr", "$1.2M". */
export function formatMoneyCompact(amount: string, currency: string): string {
  const { value, prefix, suffix, locales, format } = compactMoney(
    amount,
    currency,
  )
  return `${prefix}${formatNumber(value, locales, format)}${suffix}`
}

/** A calendar date (hire date, effective date). It has no time zone, so it's shown as stored. */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate) // "2026-10-31" parses as UTC midnight, so read it in UTC
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

/** A moment the API stores in UTC (e.g. when a change was recorded), in the user's local time. */
export function formatDateTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${timeFormat.format(date)}`
}

export function formatCount(count: number): string {
  return countFormat.format(count)
}
