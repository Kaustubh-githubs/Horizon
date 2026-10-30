import { z } from "zod"

import { todayIso } from "@/lib/dates"

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
  current_salary: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 1250000 or 1250000.50")
    .refine((amount) => Number(amount) > 0, "Must be more than zero")
    // Money columns hold up to 13 digits before the decimal point (ADR 0006).
    .refine((amount) => Number(amount) < 1e13, "That amount is too large"),
})

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>
