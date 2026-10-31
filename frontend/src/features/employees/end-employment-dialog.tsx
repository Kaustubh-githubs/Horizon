import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/date-picker"
import { Label } from "@/components/ui/label"
import {
  employeeKey,
  useEmployeeTimeline,
  useEndEmployment,
  type Employee,
  type TimelineEvent,
} from "@/features/employees/api"
import { ApiError, errorSentences } from "@/lib/api"
import { todayIso } from "@/lib/dates"
import { formatDate } from "@/lib/format"

const SALARY_EVENTS: TimelineEvent["kind"][] = ["salary_change", "promotion"]

/**
 * Ending someone's employment asks for confirmation and their last working day
 * (docs/requirements.md, ADR 0017). The record is kept; it can't be changed afterwards.
 */
export function EndEmploymentDialog({ employee }: { employee: Employee }) {
  const [open, setOpen] = useState(false)
  const [lastDay, setLastDay] = useState(todayIso)
  const endEmployment = useEndEmployment(employee.id)
  const queryClient = useQueryClient()

  // The last day can't be in the future, or before the hire date or the latest salary change
  // (the API checks both). The timeline is already loaded on the profile; until it is, the hire
  // date is the limit and the API still checks the rest.
  const timeline = useEmployeeTimeline(employee.id)
  const today = todayIso()
  const earliest = [
    employee.hire_date,
    ...(timeline.data?.events ?? [])
      .filter((event) => SALARY_EVENTS.includes(event.kind))
      .map((event) => event.date),
  ]
    .sort()
    .at(-1)!
  // The calendar keeps to min and max, but the limit can move after a day is picked (the
  // timeline loads a later salary change), so the day is checked again here.
  const outOfRange = lastDay !== "" && (lastDay < earliest || lastDay > today)

  const error = endEmployment.error
  const conflict = error instanceof ApiError && error.status === 409
  const message = outOfRange
    ? `Pick a day from ${formatDate(earliest)} to today.`
    : conflict
      ? "Someone else changed this employee while this was open. Their changes are loaded now; check the date and try again."
      : error instanceof ApiError
        ? errorSentences(error.errors, {
            terminated_on: "The last working day",
          }).join(" ")
        : error && "Couldn't save. Try again."

  const onConfirm = () =>
    endEmployment.mutate(
      { terminated_on: lastDay, lock_version: employee.lock_version },
      {
        onSuccess: () => {
          setOpen(false)
          toast.success(`${employee.full_name}'s employment ended`)
        },
        onError: (failure) => {
          if (failure instanceof ApiError && failure.status === 409)
            void queryClient.invalidateQueries({
              queryKey: employeeKey(employee.id),
            })
        },
      },
    )

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) endEmployment.reset()
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive">End employment</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            End {employee.full_name}&apos;s employment?
          </AlertDialogTitle>
          <AlertDialogDescription>
            They&apos;ll move to former employees. Their record and salary
            history are kept, but can&apos;t be changed afterwards, and this
            can&apos;t be undone in Horizon.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="last_working_day">Last working day</Label>
          <DatePicker
            id="last_working_day"
            min={earliest}
            max={today}
            value={lastDay}
            onChange={(day) => {
              setLastDay(day)
              endEmployment.reset() // the old error was about the old date
            }}
            aria-invalid={message ? true : undefined}
            aria-describedby={message ? "last_working_day-error" : undefined}
          />
          {message && (
            <p
              id="last_working_day-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {message}
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!lastDay || outOfRange || endEmployment.isPending}
            onClick={onConfirm}
          >
            {endEmployment.isPending ? "Saving…" : "End employment"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
