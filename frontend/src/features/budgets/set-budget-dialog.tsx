import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

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
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  useBudgetOverview,
  useSaveBudget,
  type DepartmentBudget,
  type SaveBudgetInput,
} from "@/features/budgets/api"
import { BudgetStatusLabel } from "@/features/budgets/budget-status"
import { runwayText, statusFor } from "@/features/budgets/runway"
import { ApiError, errorSentences } from "@/lib/api"
import { formatCount, formatMoney } from "@/lib/format"
import { isValidAmount, moneyAmount } from "@/lib/money"

const schema = z.object({ amount: moneyAmount })
type Values = z.infer<typeof schema>

/**
 * Someone else got there first: they changed this budget (409, ADR 0017), or set it while this
 * dialog was open. A new budget is always for this year, so a `year` error when setting one can
 * only be the one-budget-per-year rule.
 */
function isConflict(error: unknown, input: SaveBudgetInput | undefined) {
  if (!(error instanceof ApiError)) return false
  if (error.status === 409) return true
  return input !== undefined && !("id" in input) && "year" in error.errors
}

export type BudgetTarget = {
  year: number
  currency: string
  department: DepartmentBudget
}

/**
 * Sets or changes a department's budget for this year (ADR 0020). It shows today's payroll and
 * previews the status and runway as HR types, so the effect of a number is clear first.
 */
export function SetBudgetDialog({
  target,
  onClose,
}: {
  target: BudgetTarget | null
  onClose: () => void
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {target && <SetBudgetForm target={target} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function SetBudgetForm({
  target,
  onDone,
}: {
  target: BudgetTarget
  onDone: () => void
}) {
  const { department, currency, year } = target
  // The budget as the dialog opened with it. A background refetch (e.g. on window focus) must not
  // swap in someone else's number under HR's typing: the save sends this lock_version, and a
  // conflict is reported instead (ADR 0017). Their budget is loaded only after a conflict.
  const [loaded, setLoaded] = useState(department.budget)
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { amount: loaded?.amount ?? "" },
  })
  const amount = useWatch({ control, name: "amount" })
  const overview = useBudgetOverview()
  const saveBudget = useSaveBudget()

  const error = saveBudget.error
  const conflict = isConflict(error, saveBudget.variables)
  useEffect(() => {
    const message = error instanceof ApiError && error.errors.amount
    if (message)
      setError("amount", { type: "server", message: message.join(", ") })
  }, [error, setError])
  // The amount's errors show under its field. Only a change can fail on the year: its year
  // ended while the page was open.
  const formErrors =
    error instanceof ApiError && !conflict
      ? Object.entries(error.errors).flatMap(([field, messages]) =>
          field === "amount"
            ? []
            : field === "year"
              ? [
                  `The ${year} budget can't be changed now that the year has ended. Reload the page for this year's budgets.`,
                ]
              : errorSentences({ [field]: messages }),
        )
      : []

  const payroll = Number(department.payroll)
  const preview =
    isValidAmount(amount) && payroll > 0
      ? {
          percent: Math.round((payroll / Number(amount)) * 1000) / 10,
          runway: (12 * Number(amount)) / payroll,
        }
      : null

  // Loads their budget, so HR sees it and the next save goes on top of it.
  const loadLatest = () =>
    void overview.refetch().then((result) => {
      const latest = result.data?.departments.find(
        (d) => d.id === department.id,
      )
      // refetch resolves even when the request fails; keeping the old version would only
      // lead to the same conflict again.
      if (result.isError || !latest)
        toast.error("Couldn't load the latest budget. Try again.")
      else setLoaded(latest.budget)
    })

  const onSubmit = handleSubmit(({ amount: value }) =>
    saveBudget.mutate(
      loaded
        ? { id: loaded.id, amount: value, lock_version: loaded.lock_version }
        : { department_id: department.id, amount: value },
      {
        onSuccess: (saved) => {
          toast.success(
            `${department.name}: ${formatMoney(saved.amount, saved.currency)} for ${saved.year}`,
          )
          onDone()
        },
        onError: (failure, input) => {
          if (isConflict(failure, input)) loadLatest()
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
      <DialogHeader>
        <DialogTitle>
          {loaded ? "Change" : "Set"} {department.name}&apos;s {year} budget
        </DialogTitle>
        <DialogDescription>
          {loaded && `Now ${formatMoney(loaded.amount, currency)}. `}
          Yearly, in {currency}. Compared with today&apos;s payroll:{" "}
          {formatMoney(department.payroll, currency)} a year for{" "}
          {formatCount(department.headcount)}{" "}
          {department.headcount === 1 ? "person" : "people"}.
        </DialogDescription>
      </DialogHeader>

      <FormField
        id="amount"
        label={`Budget (${currency})`}
        error={errors.amount?.message}
        hint={
          isValidAmount(amount)
            ? formatMoney(amount, currency)
            : "The whole year's pay budget for this department."
        }
      >
        <Input
          id="amount"
          inputMode="decimal"
          autoFocus
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={errors.amount ? "amount-error" : undefined}
          {...register("amount")}
        />
      </FormField>

      {preview && (
        <div className="flex flex-col gap-1 rounded-lg border bg-muted/40 p-3 text-sm">
          <BudgetStatusLabel
            status={statusFor(preview.percent)}
            percent={preview.percent}
          />
          <span className="text-muted-foreground">
            {runwayText(preview.runway)} at today&apos;s payroll.
          </span>
        </div>
      )}

      {(conflict || formErrors.length > 0) && (
        <p role="alert" className="text-sm text-destructive">
          {conflict
            ? "Someone else saved this budget while you were editing. Their number is shown above; check it and save again."
            : formErrors.join(" ")}
        </p>
      )}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={saveBudget.isPending}>
          {saveBudget.isPending ? "Saving…" : "Save budget"}
        </Button>
      </DialogFooter>
    </form>
  )
}
