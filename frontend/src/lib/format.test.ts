import { describe, expect, it } from "vitest"

import {
  compactMoney,
  formatCount,
  formatDate,
  formatDateTime,
  formatMoney,
  formatMoneyCompact,
  formatMoneyWhole,
} from "@/lib/format"

describe("formatMoney", () => {
  it("writes rupees with Indian digit grouping", () => {
    expect(formatMoney("5307247.34", "INR")).toBe("₹53,07,247.34")
  })

  it("uses each currency's own decimals, so yen has none", () => {
    expect(formatMoney("1500000", "JPY")).toBe("¥1,500,000")
    expect(formatMoney("1500000.5", "USD")).toBe("$1,500,000.50")
  })
})

describe("formatMoneyCompact", () => {
  it("writes rupees in lakh and crore, as HR in India reads them", () => {
    expect(formatMoneyCompact("60218300000", "INR")).toBe("₹6,021.83 Cr")
    expect(formatMoneyCompact("5307000", "INR")).toBe("₹53.07 L")
    expect(formatMoneyCompact("85000", "INR")).toBe("₹85,000")
  })

  it("uses the usual compact form for other currencies", () => {
    expect(formatMoneyCompact("1200000", "USD")).toBe("$1.2M")
  })

  it("keeps the sign in front of the currency", () => {
    expect(formatMoneyCompact("-5307000", "INR")).toBe("-₹53.07 L")
  })
})

describe("compactMoney", () => {
  it("keeps the unit of the final figure, for numbers that roll up to it", () => {
    expect(compactMoney("60218300000", "INR")).toMatchObject({
      value: 6021.83,
      prefix: "₹",
      suffix: " Cr",
    })
  })
})

describe("formatMoneyWhole", () => {
  it("drops the paise, for figures that only indicate", () => {
    expect(formatMoneyWhole("3040176.19", "INR")).toBe("₹30,40,176")
  })
})

describe("formatDate and formatCount", () => {
  it("shows a calendar date as stored, whatever the browser's time zone", () => {
    expect(formatDate("2026-10-31")).toBe("31 Oct 2026")
  })

  // As the API writes dates in its messages; Intl's en-GB form would say "Sept".
  it("abbreviates September to three letters, like every other month", () => {
    expect(formatDate("2022-09-08")).toBe("8 Sep 2022")
  })

  it("shows a recorded moment in the user's local time", () => {
    const localMoment = new Date(2022, 8, 8, 14, 5).toISOString()
    expect(formatDateTime(localMoment)).toBe("8 Sep 2022, 14:05")
  })

  it("groups counts in thousands", () => {
    expect(formatCount(9194)).toBe("9,194")
  })
})
