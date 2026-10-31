import { describe, expect, it } from "vitest"

import { isValidAmount, moneyAmount, typedAmount } from "@/lib/money"

describe("moneyAmount", () => {
  it("accepts whole amounts and up to two decimals", () => {
    expect(isValidAmount("1250000")).toBe(true)
    expect(isValidAmount("1250000.50")).toBe(true)
  })

  // The API refuses these too (ADR 0006): the form says so before saving.
  it.each([
    ["1250000.999", "Enter an amount like 1250000 or 1250000.50"],
    ["12,50,000", "Enter an amount like 1250000 or 1250000.50"],
    ["0", "Must be more than zero"],
    ["10000000000000", "That amount is too large"],
  ])("refuses %s", (amount, message) => {
    const result = moneyAmount.safeParse(amount)

    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe(message)
  })
})

describe("typedAmount", () => {
  it("writes an API amount the way someone would type it", () => {
    expect(typedAmount("1500000.0")).toBe("1500000")
    expect(typedAmount("1500000.5")).toBe("1500000.50")
    expect(typedAmount("1500000.25")).toBe("1500000.25")
  })
})
