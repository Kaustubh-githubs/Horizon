import type { UseQueryResult } from "@tanstack/react-query"

import { BackLink } from "@/components/back-link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api"

/**
 * What to show while an employee page's data (the employee, the lookups) is loading, missing
 * or failed. Returns null once everything has loaded and `ready` is true, so the page renders.
 */
export function EmployeeLoadState({
  queries,
  ready = true,
}: {
  queries: UseQueryResult[]
  ready?: boolean
}) {
  const failed = queries.find((query) => query.isError)

  if (failed) {
    // Only the employee request can 404; a failed lookups request isn't about an employee.
    const notFound =
      failed.error instanceof ApiError && failed.error.status === 404
    return (
      <section className="flex flex-col items-start gap-3">
        <BackLink to="/employees">Employees</BackLink>
        <h1 className="font-heading text-2xl font-semibold">
          {notFound ? "Employee not found" : "Couldn't load this page"}
        </h1>
        {notFound ? (
          <p className="text-muted-foreground">
            Check the link, or find them in the directory.
          </p>
        ) : (
          <Button variant="outline" onClick={() => void failed.refetch()}>
            Try again
          </Button>
        )}
      </section>
    )
  }

  if (!ready || queries.some((query) => query.isPending)) {
    return (
      <section className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full max-w-3xl" />
      </section>
    )
  }

  return null
}
