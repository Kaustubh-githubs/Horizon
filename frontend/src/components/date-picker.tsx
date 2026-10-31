import { CalendarIcon } from "lucide-react"
import { useState } from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

// Calendar dates are "yyyy-mm-dd" everywhere in Horizon (ADR 0005). The calendar works with
// local Date objects, so each is built from its parts: parsing "2026-10-31" as a Date would
// read it as UTC midnight, and in the Americas show the 30th.
const toDate = (iso: string | undefined) => {
  if (!iso) return undefined
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day)
}
const toIso = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")

/**
 * A date field with a calendar, the same in every browser, unlike the native date input. Shows
 * the date the way the rest of the app does ("31 Oct 2026"). `min` and `max` grey out the days
 * outside them, and the month and year dropdowns reach a hire date years back.
 */
export function DatePicker({
  id,
  value,
  onChange,
  onBlur,
  min,
  max,
  disabled,
  placeholder = "Pick a date",
  className,
  ...aria
}: {
  id?: string
  /** "yyyy-mm-dd", or "" for none. */
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  min?: string
  max?: string
  disabled?: boolean
  placeholder?: string
  className?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = toDate(value)
  const earliest = toDate(min)
  const latest = toDate(max)

  return (
    // Modal, so it works inside a dialog too (as the Combobox does).
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          onBlur={onBlur}
          data-placeholder={selected ? undefined : ""}
          className={cn(
            // The same look as the other inputs.
            "flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground dark:bg-input/30",
            className,
          )}
          {...aria}
        >
          {value ? formatDate(value) : placeholder}
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (!date) return
            onChange(toIso(date))
            setOpen(false)
          }}
          defaultMonth={selected ?? latest}
          startMonth={earliest ?? new Date(1980, 0)}
          endMonth={latest ?? new Date()}
          disabled={[
            ...(earliest ? [{ before: earliest }] : []),
            ...(latest ? [{ after: latest }] : []),
          ]}
          captionLayout="dropdown"
          weekStartsOn={1}
          autoFocus
          className="horizon-calendar"
        />
      </PopoverContent>
    </Popover>
  )
}
