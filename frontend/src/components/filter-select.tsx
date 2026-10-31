import { Combobox } from "@/components/combobox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Radix Select can't hold an empty value, so "all" stands for "no filter".
const ALL = "all"

export type FilterOption = { value: string; label: string }

/**
 * One filter: `allLabel` (no filter, so `undefined`) or one of `options`. With a
 * `searchPlaceholder`, a Combobox you can type into, for the long lists (job titles,
 * departments); otherwise a plain Select. Used by the directory, the insights page and the ★ list.
 */
export function FilterSelect({
  label,
  allLabel,
  value,
  options,
  searchPlaceholder,
  className,
  onChange,
}: {
  /** The accessible name, e.g. "Department". */
  label: string
  allLabel: string
  value: string | undefined
  options: FilterOption[]
  searchPlaceholder?: string
  className?: string
  onChange: (value: string | undefined) => void
}) {
  if (searchPlaceholder)
    return (
      <Combobox
        aria-label={label}
        value={value}
        onChange={onChange}
        options={options}
        allLabel={allLabel}
        searchPlaceholder={searchPlaceholder}
        className={className}
      />
    )

  return (
    <Select
      value={value ?? ALL}
      onValueChange={(next) => onChange(next === ALL ? undefined : next)}
    >
      <SelectTrigger aria-label={label} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
