import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Placeholders shaped like what they stand for, so the page doesn't jump when the data arrives.
// A line of `text-sm` is 20px tall: a 16px bar with 2px above and below.

/** A line of small text. */
export function TextLine({ className }: { className?: string }) {
  return <Skeleton className={cn("my-0.5 h-4", className)} />
}

/** A headline number tile: label, big value, detail line. */
export function StatTileSkeleton() {
  return (
    <Card aria-hidden="true">
      <CardContent className="flex flex-col gap-1">
        <TextLine className="w-28" />
        <Skeleton className="my-1 h-7 w-36" />
        <TextLine className="w-44" />
      </CardContent>
    </Card>
  )
}

/** A table: a header row and `rows` rows of `columns` cells, the first one wider. */
export function TableSkeleton({
  columns,
  rows = 6,
  className,
}: {
  columns: number
  rows?: number
  className?: string
}) {
  const row = (key: number, header = false) => (
    <div key={key} className="flex items-center gap-6 border-b px-2 py-2.5">
      {Array.from({ length: columns }, (_, cell) => (
        <TextLine
          key={cell}
          className={cn(
            cell === 0 ? "w-40" : "flex-1",
            header && "bg-muted/60",
          )}
        />
      ))}
    </div>
  )

  return (
    <div aria-hidden="true" className={cn("flex flex-col", className)}>
      {row(-1, true)}
      {Array.from({ length: rows }, (_, index) => row(index))}
    </div>
  )
}

/** The timeline: a year label, then events with an icon and two lines each. */
export function TimelineSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <Skeleton className="h-5 w-12" />
      {Array.from({ length: items }, (_, index) => (
        <div key={index} className="flex items-start gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1">
            <TextLine className="w-48" />
            <TextLine className="w-72" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** A card with a title and a label-and-value grid, like the profile's details. */
export function DetailsCardSkeleton({ items = 6 }: { items?: number }) {
  return (
    <Card aria-hidden="true">
      <CardHeader>
        <Skeleton className="h-5 w-20" />
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: items }, (_, index) => (
          <div key={index} className="flex flex-col gap-1">
            <TextLine className="w-20" />
            <Skeleton className="my-0.5 h-5 w-40" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
