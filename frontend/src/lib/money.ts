import { z } from "zod"

/**
 * An amount typed into a form, checked the way the API checks it: up to two decimals, above
 * zero, and small enough for the money columns, which hold under 10^13 (ADR 0006).
 */
export const moneyAmount = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 1250000 or 1250000.50")
  .refine((amount) => Number(amount) > 0, "Must be more than zero")
  .refine((amount) => Number(amount) < 1e13, "That amount is too large")

/** Whether a typed amount is valid, e.g. to decide when to show a preview. */
export const isValidAmount = (value: string) =>
  moneyAmount.safeParse(value).success

/**
 * An API amount the way someone would type it, e.g. as a placeholder: "1500000.0" becomes
 * "1500000", and "1500000.5" becomes "1500000.50".
 */
export function typedAmount(amount: string): string {
  const [whole, fraction = ""] = amount.split(".")
  return /^0*$/.test(fraction) ? whole : `${whole}.${fraction.padEnd(2, "0")}`
}
