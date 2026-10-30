import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, type ReactNode } from "react"
import { Controller, useForm, useWatch, type Control } from "react-hook-form"

import { FormField as Field } from "@/components/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Lookups } from "@/features/employees/api"
import {
  employeeFormSchema,
  type EmployeeFormValues,
} from "@/features/employees/employee-form-schema"
import type { ApiErrors } from "@/lib/api"
import { todayIso } from "@/lib/dates"
import { formatMoney } from "@/lib/format"

type FieldName = keyof EmployeeFormValues
const FIELDS = Object.keys(employeeFormSchema.shape) as FieldName[]
const isField = (key: string): key is FieldName =>
  (FIELDS as string[]).includes(key)

function SelectField({
  name,
  label,
  placeholder,
  options,
  control,
  error,
  disabled,
  hint,
}: {
  name: "country_id" | "department_id" | "job_title_id"
  label: string
  placeholder: string
  options: { value: string; label: string }[]
  control: Control<EmployeeFormValues>
  error?: string
  disabled?: boolean
  hint?: ReactNode
}) {
  return (
    <Field id={name} label={label} error={error} hint={hint}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger
              id={name}
              className="w-full"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${name}-error` : undefined}
              onBlur={field.onBlur}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  )
}

/**
 * The add and edit form. Country, hire date and salary can only be set when adding: they're
 * fixed afterwards, and salary changes have their own flow (ADR 0017). Errors from the API are
 * shown next to their field; anything else appears above the buttons.
 */
export function EmployeeForm({
  mode,
  defaultValues,
  lookups,
  serverErrors,
  formMessage,
  submitLabel,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit"
  defaultValues: EmployeeFormValues
  lookups: Lookups
  serverErrors?: ApiErrors
  formMessage?: ReactNode
  submitLabel: string
  isSubmitting: boolean
  onSubmit: (values: EmployeeFormValues) => void
  onCancel: () => void
}) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues,
  })

  useEffect(() => {
    for (const [field, messages] of Object.entries(serverErrors ?? {})) {
      if (isField(field))
        setError(field, { type: "server", message: messages.join(", ") })
    }
  }, [serverErrors, setError])

  const otherErrors = Object.entries(serverErrors ?? {})
    .filter(([field]) => !isField(field))
    .flatMap(([, messages]) => messages)

  const fixed = mode === "edit"
  const [countryId, salary] = useWatch({
    control,
    name: ["country_id", "current_salary"],
  })
  const currency = lookups.countries.find(
    (country) => String(country.id) === countryId,
  )?.currency_code
  const salaryPreview =
    currency &&
    employeeFormSchema.shape.current_salary.safeParse(salary).success
      ? `${formatMoney(salary, currency)} a year. Salary history starts today.`
      : "Annual gross base pay, in the country's currency. Salary history starts today."

  const textInput = (name: "full_name" | "email" | "hire_date") => ({
    id: name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    ...register(name),
  })

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="full_name"
          label="Full name"
          error={errors.full_name?.message}
        >
          <Input autoFocus={!fixed} {...textInput("full_name")} />
        </Field>
        <Field id="email" label="Work email" error={errors.email?.message}>
          <Input type="email" {...textInput("email")} />
        </Field>

        <SelectField
          name="department_id"
          label="Department"
          placeholder="Pick a department"
          control={control}
          error={errors.department_id?.message}
          options={lookups.departments.map((d) => ({
            value: String(d.id),
            label: d.name,
          }))}
        />
        <SelectField
          name="job_title_id"
          label="Job title"
          placeholder="Pick a job title"
          control={control}
          error={errors.job_title_id?.message}
          // Editing the title is for fixing a wrong entry. A promotion changes pay too (ADR 0018).
          hint={
            fixed &&
            "To promote someone, use Change salary → Promotion on their profile, so pay and history change too."
          }
          options={lookups.job_titles.map((t) => ({
            value: String(t.id),
            label: t.name,
          }))}
        />

        <SelectField
          name="country_id"
          label="Country"
          placeholder="Pick a country"
          control={control}
          error={errors.country_id?.message}
          disabled={fixed}
          hint={fixed && "Fixed after the employee is added."}
          options={lookups.countries.map((c) => ({
            value: String(c.id),
            label: `${c.name} (${c.currency_code})`,
          }))}
        />
        <Field
          id="hire_date"
          label="Hire date"
          error={errors.hire_date?.message}
          hint={fixed && "Fixed after the employee is added."}
        >
          <Input
            type="date"
            max={todayIso()}
            disabled={fixed}
            {...textInput("hire_date")}
          />
        </Field>

        {!fixed && (
          <Field
            id="current_salary"
            label={`Annual salary${currency ? ` (${currency})` : ""}`}
            error={errors.current_salary?.message}
            hint={salaryPreview}
          >
            <Input
              id="current_salary"
              inputMode="decimal"
              placeholder="1250000"
              aria-invalid={errors.current_salary ? true : undefined}
              aria-describedby={
                errors.current_salary ? "current_salary-error" : undefined
              }
              {...register("current_salary")}
            />
          </Field>
        )}
      </div>

      {(otherErrors.length > 0 || formMessage) && (
        <div
          role="alert"
          className="flex flex-col gap-2 text-sm text-destructive"
        >
          {otherErrors.map((message) => (
            <p key={message}>{message}</p>
          ))}
          {formMessage}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
