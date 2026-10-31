import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { useState } from "react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type Option = { value: string; label: string }

const containsFilter = (value: string, search: string) =>
  value.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0

/**
 * A select you can type into, for the long lists (job titles, departments). It looks like a
 * Select when closed; open, a search box sits above the options. With `allLabel`, a first
 * option clears the choice (a filter's "All job titles"), and `onChange` gets undefined.
 */
export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  allLabel,
  disabled,
  className,
  onBlur,
  ...aria
}: {
  id?: string
  value: string | undefined
  onChange: (value: string | undefined) => void
  options: Option[]
  placeholder?: string
  searchPlaceholder: string
  allLabel?: string
  disabled?: boolean
  className?: string
  onBlur?: () => void
  "aria-label"?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)
  const pick = (next: string | undefined) => {
    onChange(next)
    setOpen(false)
  }
  const shown = selected?.label ?? allLabel

  return (
    // Modal, so the list scrolls with the wheel inside a dialog too (the dialog locks scrolling
    // outside itself, and the list is portaled out of it).
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          onBlur={onBlur}
          data-placeholder={shown ? undefined : ""}
          className={cn(
            // The same look as SelectTrigger.
            "flex h-8 w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50",
            className,
          )}
          {...aria}
        >
          <span className="line-clamp-1 text-left">{shown ?? placeholder}</span>
          <ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-56 p-0"
      >
        {/* Plain "contains" matching: cmdk's fuzzy default also offers Marketing and Design for
            "eng", which surprises more than it helps on short lists of names. */}
        <Command filter={containsFilter}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {allLabel && (
                <Item
                  label={allLabel}
                  checked={!value}
                  onSelect={() => pick(undefined)}
                />
              )}
              {options.map((option) => (
                <Item
                  key={option.value}
                  label={option.label}
                  checked={option.value === value}
                  onSelect={() => pick(option.value)}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function Item({
  label,
  checked,
  onSelect,
}: {
  label: string
  checked: boolean
  onSelect: () => void
}) {
  return (
    // cmdk searches an item's value; the label is what people type.
    <CommandItem value={label} onSelect={onSelect}>
      {label}
      {checked && (
        <CheckIcon className="pointer-events-none absolute right-2 size-4" />
      )}
    </CommandItem>
  )
}
