import {
  ArrowDownIcon,
  ArrowUpIcon,
  BanknoteIcon,
  BriefcaseIcon,
  Building2Icon,
  CalendarHeartIcon,
  LogOutIcon,
  TrendingUpIcon,
  UserPlusIcon,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"

import { TimelineSkeleton } from "@/components/skeletons"
import { LoadError } from "@/components/load-error"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  useEmployeeTimeline,
  type Employee,
  type FieldChange,
  type TimelineEvent,
} from "@/features/employees/api"
import { formatFieldValue } from "@/features/employees/field-values"
import { FromTo } from "@/features/employees/from-to"
import { formatPercent, REASON_LABELS } from "@/features/employees/salary"
import { formatDate, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

// Each kind has its own icon and title, so the colour is never the only cue.
const KINDS: Record<
  TimelineEvent["kind"],
  { title: string; icon: LucideIcon; tone: string }
> = {
  joined: { title: "Joined ACME", icon: UserPlusIcon, tone: "bg-teal-600" },
  salary_change: {
    title: "Salary revised",
    icon: BanknoteIcon,
    tone: "bg-sky-600",
  },
  promotion: { title: "Promoted", icon: TrendingUpIcon, tone: "bg-violet-600" },
  department: {
    title: "Department changed",
    icon: Building2Icon,
    tone: "bg-emerald-600",
  },
  job_title: {
    title: "Job title changed",
    icon: BriefcaseIcon,
    tone: "bg-orange-600",
  },
  anniversary: {
    title: "Work anniversary",
    icon: CalendarHeartIcon,
    tone: "bg-amber-600",
  },
  ended: { title: "Employment ended", icon: LogOutIcon, tone: "bg-rose-600" },
}

const ordinalRules = new Intl.PluralRules("en", { type: "ordinal" })
const ORDINAL_SUFFIXES: Record<Intl.LDMLPluralRule, string> = {
  zero: "th",
  one: "st",
  two: "nd",
  few: "rd",
  many: "th",
  other: "th",
}
const ordinal = (n: number) => `${n}${ORDINAL_SUFFIXES[ordinalRules.select(n)]}`

/**
 * The employee's story by date (ADR 0021), newest first and grouped by year: joining, salary
 * changes, promotions, department and title moves, work anniversaries and leaving.
 */
export function TimelineCard({ employee }: { employee: Employee }) {
  const timeline = useEmployeeTimeline(employee.id)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {timeline.isPending ? (
          <TimelineSkeleton />
        ) : timeline.isError ? (
          <LoadError
            what="the timeline"
            onRetry={() => void timeline.refetch()}
          />
        ) : (
          <ol className="relative flex flex-col gap-2">
            {/* The line the events hang from, through the middle of the icons. */}
            <span
              aria-hidden="true"
              className="absolute top-3 bottom-3 left-4 w-px bg-border"
            />
            {byYear(timeline.data.events).map(([year, events]) => (
              <li key={year} className="flex flex-col">
                <h3 className="relative w-fit rounded-md bg-muted-foreground px-2 py-0.5 text-xs font-medium text-background tabular-nums">
                  {year}
                </h3>
                <ol className="flex flex-col">
                  {events.map((event, index) => (
                    <TimelineItem
                      key={`${event.kind}-${event.date}-${index}`}
                      event={event}
                      currency={timeline.data.currency}
                    />
                  ))}
                </ol>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

/** Events are newest first, so years come out newest first too. */
function byYear(events: TimelineEvent[]): [string, TimelineEvent[]][] {
  const years = new Map<string, TimelineEvent[]>()
  for (const event of events) {
    const year = event.date.slice(0, 4)
    years.set(year, [...(years.get(year) ?? []), event])
  }
  return [...years]
}

function TimelineItem({
  event,
  currency,
}: {
  event: TimelineEvent
  currency: string
}) {
  const { title, icon: Icon, tone } = KINDS[event.kind]
  // When a revision was entered on another day than it took effect (seeded or back-dated ones).
  const recordedLater =
    event.recorded_at !== undefined &&
    event.recorded_at.slice(0, 10) !== event.date

  return (
    <li className="flex gap-3 py-3">
      <span
        className={cn(
          "relative flex size-8 shrink-0 items-center justify-center rounded-full text-white ring-4 ring-card",
          tone,
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col gap-2 pt-0.5">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">
            {formatDate(event.date)}
          </p>
          {recordedLater && event.recorded_at && (
            <p className="text-xs text-muted-foreground">
              Recorded {formatDateTime(event.recorded_at)}
            </p>
          )}
        </div>
        <Details event={event} currency={currency} />
      </div>
    </li>
  )
}

function Details({
  event,
  currency,
}: {
  event: TimelineEvent
  currency: string
}) {
  const find = (field: string) => event.changes.find((c) => c.field === field)

  if (event.kind === "anniversary")
    return <Chip>{ordinal(event.years ?? 0)} work anniversary</Chip>

  if (event.kind === "joined") {
    const role = [find("job_title")?.to, find("department")?.to].filter(Boolean)
    const salary = find("salary")?.to
    return (
      <>
        {role.length > 0 && <Chip>{role.join(" · ")}</Chip>}
        {salary && (
          <Chip>
            Starting salary {formatFieldValue("salary", salary, currency)}
          </Chip>
        )}
      </>
    )
  }

  return (
    <>
      {event.changes.map((change) => (
        <Chip key={change.field}>
          {change.field === "salary" ? (
            <SalaryChange
              change={change}
              currency={currency}
              percent={event.change_percent ?? null}
            />
          ) : (
            <FromTo
              from={
                change.from &&
                formatFieldValue(change.field, change.from, currency)
              }
              to={formatFieldValue(change.field, change.to, currency)}
            />
          )}
        </Chip>
      ))}
      {event.kind === "salary_change" && event.reason && (
        <p className="text-xs text-muted-foreground">
          {REASON_LABELS[event.reason]}
        </p>
      )}
    </>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-fit flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-muted px-3 py-2 text-sm">
      {children}
    </div>
  )
}

// Direction is shown by the arrow and the sign as well as the colour, and comes from the amounts,
// so a tiny raise that rounds to 0% still reads as a raise.
function SalaryChange({
  change,
  currency,
  percent,
}: {
  change: FieldChange
  currency: string
  percent: number | null
}) {
  const up = change.from !== null && Number(change.to) > Number(change.from)
  const Icon = up ? ArrowUpIcon : ArrowDownIcon
  return (
    <>
      <FromTo
        from={change.from && formatFieldValue("salary", change.from, currency)}
        to={formatFieldValue("salary", change.to, currency)}
      />
      {percent !== null && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 tabular-nums",
            up ? "text-positive" : "text-destructive",
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {up && percent === 0 ? "+" : ""}
          {formatPercent(percent)}
        </span>
      )}
    </>
  )
}
