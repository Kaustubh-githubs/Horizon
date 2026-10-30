import { z } from "zod"

import type { SalaryChange } from "@/features/employees/api"
import { CHANGE_REASONS } from "@/features/employees/salary"
import { moneyAmount } from "@/lib/money"

export const isChangeReason = (
  value: string,
): value is SalaryChange["reason"] =>
  (CHANGE_REASONS as readonly string[]).includes(value)

/**
 * The change-salary form. Built per employee, because two rules depend on them: the amount
 * must differ from the current salary, and a promotion needs a different job title (ADR 0018).
 * The API checks the same rules.
 */
export function salaryChangeSchema(current: {
  salary: string
  jobTitleId: number
}) {
  return z
    .object({
      // A plain string, so the form can start empty; the type guard narrows it once valid.
      reason: z.string().refine(isChangeReason, "Pick a reason"),
      amount: moneyAmount.refine(
        (amount) => Number(amount) !== Number(current.salary),
        "Must be different from the current salary",
      ),
      job_title_id: z.string(),
    })
    .refine(
      (values) =>
        values.reason !== "promotion" ||
        (values.job_title_id !== "" &&
          values.job_title_id !== String(current.jobTitleId)),
      { path: ["job_title_id"], message: "Pick the new job title" },
    )
}

type SalaryChangeSchema = ReturnType<typeof salaryChangeSchema>
/** What the form holds (the reason starts empty)… */
export type SalaryChangeInput = z.input<SalaryChangeSchema>
/** …and what it submits once valid (the reason narrowed to a change reason). */
export type SalaryChangeOutput = z.output<SalaryChangeSchema>
