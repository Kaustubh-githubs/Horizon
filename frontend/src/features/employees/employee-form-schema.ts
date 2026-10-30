import { z } from "zod"

import { todayIso } from "@/lib/dates"
import { moneyAmount } from "@/lib/money"

// The same rules the API enforces (ADR 0017), checked in the browser first for quick feedback.
export const employeeFormSchema = z.object({
  full_name: z.string().trim().min(1, "Enter the employee's name"),
  // Deliberately loose, like the API's check (name@domain): a stricter browser rule would
  // block saving employees whose address the API already accepted.
  email: z
    .string()
    .trim()
    .regex(/^[^\s@]+@[^\s@]+$/, "Enter a valid email address"),
  hire_date: z.iso
    .date("Pick the hire date")
    .refine((date) => date <= todayIso(), "Can't be in the future"),
  country_id: z.string().min(1, "Pick a country"),
  department_id: z.string().min(1, "Pick a department"),
  job_title_id: z.string().min(1, "Pick a job title"),
  current_salary: moneyAmount,
})

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>
