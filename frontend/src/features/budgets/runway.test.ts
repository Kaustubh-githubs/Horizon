import { describe, expect, it } from "vitest"

import { runwayText, statusFor } from "@/features/budgets/runway"

// ADR 0020: how far into the year a budget lasts, and its status band.
describe("runwayText", () => {
  it("names the month the budget runs out in", () => {
    expect(runwayText(10.4)).toBe("Runs out in November")
    expect(runwayText(0.5)).toBe("Runs out in January")
  })

  it("covers the year from 12 months", () => {
    expect(runwayText(12)).toBe("Covers the year")
  })

  it("says so when there's no payroll to measure against", () => {
    expect(runwayText(null)).toBe("No payroll yet")
  })
})

describe("statusFor", () => {
  it.each([
    [100.1, "over"],
    [100, "near"],
    [90, "near"],
    [89.9, "under"],
  ] as const)("puts %s%% in the %s band", (percent, status) => {
    expect(statusFor(percent)).toBe(status)
  })
})
