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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  employeeKey,
  useEndEmployment,
  type Employee,
} from "@/features/employees/api"
import { ApiError } from "@/lib/api"
import { todayIso } from "@/lib/dates"

// API messages are fragments ("can't be in the future"); there's only one field here, so show them as sentences.
const asSentence = (message: string) =>
  `${message.charAt(0).toUpperCase()}${message.slice(1)}.`

/**
 * Ending someone's employment asks for confirmation and their last working day
 * (docs/requirements.md, ADR 0017). The record is kept; it can't be changed afterwards.
 */
export function EndEmploymentDialog({ employee }: { employee: Employee }) {
  const [open, setOpen] = useState(false)
  const [lastDay, setLastDay] = useState(todayIso)
  const endEmployment = useEndEmployment(employee.id)
  const queryClient = useQueryClient()

  const error = endEmployment.error
  const conflict = error instanceof ApiError && error.status === 409
  const message = conflict
    ? "This employee changed since you opened the page. We've loaded the latest version, so check it and try again."
    : error instanceof ApiError
      ? Object.values(error.errors).flat().map(asSentence).join(" ")
      : error && "Couldn't save. Try again."

  const onConfirm = () =>
    endEmployment.mutate(
      { terminated_on: lastDay, lock_version: employee.lock_version },
      {
        onSuccess: () => {
          setOpen(false)
          toast.success(`${employee.full_name}'s employment has ended`)
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
          <Input
            id="last_working_day"
            type="date"
            min={employee.hire_date}
            max={todayIso()}
            value={lastDay}
            onChange={(event) => {
              setLastDay(event.target.value)
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
            disabled={!lastDay || endEmployment.isPending}
            onClick={onConfirm}
          >
            {endEmployment.isPending ? "Saving…" : "End employment"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
