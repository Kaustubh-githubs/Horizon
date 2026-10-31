import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient, type UseQueryResult } from "@tanstack/react-query"
import { ArrowDownIcon, ArrowUpIcon, TriangleAlertIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Combobox } from "@/components/combobox"
import { FormField } from "@/components/form-field"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  employeeKey,
  useChangeSalary,
  usePayComparison,
  type Employee,
  type PayComparison,
} from "@/features/employees/api"
import { useLookups } from "@/features/lookups/api"
import {
  BIG_CHANGE_PERCENT,
  CHANGE_REASONS,
  formatPercent,
  percentChange,
  REASON_LABELS,
} from "@/features/employees/salary"
import {
  salaryChangeSchema,
  type SalaryChangeInput,
  type SalaryChangeOutput,
} from "@/features/employees/salary-change-schema"
import { ApiError, errorSentences } from "@/lib/api"
import { formatCount, formatMoney, formatMoneyWhole } from "@/lib/format"
import { isValidAmount, typedAmount } from "@/lib/money"
import { cn } from "@/lib/utils"

const FORM_FIELDS = ["reason", "amount", "job_title_id"] as const
const isFormField = (key: string): key is (typeof FORM_FIELDS)[number] =>
  (FORM_FIELDS as readonly string[]).includes(key)

/**
 * Records a raise, promotion, market adjustment or correction (ADR 0018). The form shows the
 * old and new salary with the % change, and what peers in the same role and country earn,
 * and warns about unusually big changes, so an extra zero gets noticed before saving.
 */
export function ChangeSalaryDialog({ employee }: { employee: Employee }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Change salary</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Change {employee.full_name}&apos;s salary</DialogTitle>
          <DialogDescription>
            The new salary takes effect today. History can&apos;t be edited
            afterwards, so a mistake is fixed with a correction.
          </DialogDescription>
        </DialogHeader>
        {/* The dialog's content mounts each time it opens, so each opening starts with an empty
            form, and stays through the closing animation, so it doesn't vanish first. */}
        <ChangeSalaryForm employee={employee} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

function ChangeSalaryForm({
  employee,
  onDone,
}: {
  employee: Employee
  onDone: () => void
}) {
  const schema = useMemo(
    () =>
      salaryChangeSchema({
        salary: employee.current_salary,
        jobTitleId: employee.job_title.id,
      }),
    [employee.current_salary, employee.job_title.id],
  )
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SalaryChangeInput, unknown, SalaryChangeOutput>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "", amount: "", job_title_id: "" },
  })
  const [reason, amount, jobTitleId] = useWatch({
    control,
    name: ["reason", "amount", "job_title_id"],
  })
  const promotion = reason === "promotion"

  const lookups = useLookups()
  // A promotion's salary is for the new role, so its peers are only meaningful once the new
  // title is picked. Until then there's nothing to compare with.
  const awaitingNewTitle = promotion && !jobTitleId
  const comparison = usePayComparison(
    employee.id,
    promotion ? jobTitleId : undefined,
    !awaitingNewTitle,
  )
  const changeSalary = useChangeSalary(employee.id)
  const queryClient = useQueryClient()

  const error = changeSalary.error
  const conflict = error instanceof ApiError && error.status === 409
  useEffect(() => {
    if (!(error instanceof ApiError) || conflict) return
    for (const [field, messages] of Object.entries(error.errors)) {
      if (isFormField(field))
        setError(field, { type: "server", message: messages.join(", ") })
    }
  }, [error, conflict, setError])
  const otherErrors =
    error instanceof ApiError && !conflict
      ? errorSentences(
          Object.fromEntries(
            Object.entries(error.errors).filter(
              ([field]) => !isFormField(field),
            ),
          ),
        )
      : []

  const currency = employee.current_currency
  const validAmount = isValidAmount(amount)
  const warnings = bigChangeWarnings(
    employee.current_salary,
    validAmount ? amount : undefined,
    awaitingNewTitle ? undefined : comparison.data,
  )

  const onSubmit = handleSubmit((values) =>
    changeSalary.mutate(
      {
        amount: values.amount,
        reason: values.reason,
        job_title_id: promotion ? values.job_title_id : undefined,
        lock_version: employee.lock_version,
      },
      {
        onSuccess: (revision) => {
          toast.success(
            `Salary changed to ${formatMoney(revision.amount, revision.currency)}`,
          )
          onDone()
        },
        // Someone changed the employee meanwhile: load the latest, so the next save uses it.
        onError: (failure) => {
          if (failure instanceof ApiError && failure.status === 409)
            void queryClient.invalidateQueries({
              queryKey: employeeKey(employee.id),
            })
        },
      },
    ),
  )

  return (
    <form
      noValidate
      onSubmit={(event) => void onSubmit(event)}
      className="flex flex-col gap-4"
    >
      <FormField id="reason" label="Reason" error={errors.reason?.message}>
        <Controller
          name="reason"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                id="reason"
                className="w-full"
                aria-invalid={errors.reason ? true : undefined}
                aria-describedby={errors.reason ? "reason-error" : undefined}
              >
                <SelectValue placeholder="Pick a reason" />
              </SelectTrigger>
              <SelectContent>
                {CHANGE_REASONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {REASON_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      {promotion && (
        <FormField
          id="job_title_id"
          label="New job title"
          error={errors.job_title_id?.message}
          hint={`Currently ${employee.job_title.name}. A promotion changes the title and pay together.`}
        >
          <Controller
            name="job_title_id"
            control={control}
            render={({ field }) => (
              <Combobox
                id="job_title_id"
                value={field.value || undefined}
                onChange={(value) => field.onChange(value ?? "")}
                onBlur={field.onBlur}
                placeholder="Pick the new job title"
                searchPlaceholder="Search job titles"
                options={(lookups.data?.job_titles ?? [])
                  .filter((title) => title.id !== employee.job_title.id)
                  .map((title) => ({
                    value: String(title.id),
                    label: title.name,
                  }))}
                className="w-full"
                aria-invalid={errors.job_title_id ? true : undefined}
                aria-describedby={
                  errors.job_title_id ? "job_title_id-error" : undefined
                }
              />
            )}
          />
        </FormField>
      )}

      <FormField
        id="amount"
        label={`New annual salary (${currency})`}
        error={errors.amount?.message}
        hint={`Currently ${formatMoney(employee.current_salary, currency)} a year.`}
      >
        <Input
          id="amount"
          inputMode="decimal"
          placeholder={typedAmount(employee.current_salary)}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={errors.amount ? "amount-error" : undefined}
          {...register("amount")}
        />
      </FormField>

      {validAmount && (
        <ChangeSummary
          current={employee.current_salary}
          next={amount}
          currency={currency}
        />
      )}

      {awaitingNewTitle ? (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          Pick the new job title to see what people in that role earn.
        </p>
      ) : (
        <PeerPay
          comparison={comparison}
          next={validAmount ? amount : undefined}
        />
      )}

      {warnings.length > 0 && (
        <div
          role="status"
          className="flex flex-col gap-1 rounded-lg border border-warning-border bg-warning p-3 text-sm text-warning-foreground"
        >
          {warnings.map((warning) => (
            <p key={warning} className="flex gap-2">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
              {warning}
            </p>
          ))}
        </div>
      )}

      {(conflict || otherErrors.length > 0) && (
        <div role="alert" className="text-sm text-destructive">
          {conflict
            ? "This employee changed since you opened this (perhaps another salary change). We've loaded the latest version, so check the figures and save again."
            : otherErrors.join(" ")}
        </div>
      )}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={changeSalary.isPending}>
          {changeSalary.isPending ? "Saving…" : "Save change"}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Unusual numbers worth a second look (ADR 0018). Warnings only: saving isn't blocked. */
function bigChangeWarnings(
  current: string,
  next: string | undefined,
  comparison: PayComparison | undefined,
): string[] {
  if (!next) return []
  const warnings: string[] = []

  const change = percentChange(current, next)
  if (Math.abs(change) > BIG_CHANGE_PERCENT)
    warnings.push(
      `That's a ${Math.round(Math.abs(change))}% ${change > 0 ? "increase" : "decrease"}. Check for a missing or extra zero before saving.`,
    )

  if (comparison?.average && comparison.peer_count > 0) {
    const fromAverage = percentChange(comparison.average, next)
    if (Math.abs(fromAverage) > BIG_CHANGE_PERCENT)
      warnings.push(
        `That's ${Math.round(Math.abs(fromAverage))}% ${fromAverage > 0 ? "above" : "below"} the average for ${comparison.job_title.name} in ${comparison.country.name}.`,
      )
  }
  return warnings
}

function ChangeSummary({
  current,
  next,
  currency,
}: {
  current: string
  next: string
  currency: string
}) {
  const percent = percentChange(current, next)
  const up = percent > 0
  const Icon = up ? ArrowUpIcon : ArrowDownIcon

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
      <span className="text-muted-foreground">
        {formatMoney(current, currency)}
      </span>
      <span aria-hidden="true">→</span>
      <span className="font-medium">{formatMoney(next, currency)}</span>
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-sm",
          up ? "text-positive" : "text-destructive",
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
        {formatPercent(percent)} {up ? "increase" : "decrease"}
      </span>
    </p>
  )
}

/** What peers earn: the same job title in the same country, active, not this employee. */
function PeerPay({
  comparison,
  next,
}: {
  comparison: UseQueryResult<PayComparison>
  next: string | undefined
}) {
  if (comparison.isPending) return <Skeleton className="h-16 w-full" />
  if (comparison.isError)
    return (
      <p className="text-sm text-muted-foreground">
        Couldn&apos;t load what peers earn.
      </p>
    )

  const { job_title, country, currency, peer_count, average, median } =
    comparison.data
  if (peer_count === 0 || !average || !median)
    return (
      <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        No other active {job_title.name} in {country.name} to compare with.
      </p>
    )

  const fromAverage = next ? percentChange(average, next) : undefined
  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-sm">
      <p className="font-medium">
        {job_title.name} in {country.name}
      </p>
      <p className="text-muted-foreground tabular-nums">
        Average {formatMoneyWhole(average, currency)} · median{" "}
        {formatMoneyWhole(median, currency)} · {formatCount(peer_count)}{" "}
        {peer_count === 1 ? "person" : "people"}
      </p>
      {fromAverage !== undefined && (
        <p className="mt-1">
          The new salary is {Math.round(Math.abs(fromAverage))}%{" "}
          {fromAverage >= 0 ? "above" : "below"} the average.
        </p>
      )}
    </div>
  )
}
