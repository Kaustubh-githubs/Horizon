import type { UseQueryResult } from "@tanstack/react-query"

import { Breadcrumbs } from "@/components/breadcrumbs"
import {
  DetailsCardSkeleton,
  TextLine,
  TimelineSkeleton,
} from "@/components/skeletons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api"

/**
 * What to show while an employee page's data (the employee, the lookups) is loading, missing
 * or failed. Returns null once everything has loaded and `ready` is true, so the page renders.
 */
export function EmployeeLoadState({
  queries,
  ready = true,
  shape = "profile",
}: {
  queries: UseQueryResult[]
  ready?: boolean
  /** What the loading placeholder looks like: the profile, or the add and edit form. */
  shape?: "profile" | "form"
}) {
  const failed = queries.find((query) => query.isError)

  if (failed) {
    // Only the employee request can 404; a failed lookups request isn't about an employee.
    const notFound =
      failed.error instanceof ApiError && failed.error.status === 404
    return (
      <section className="flex flex-col items-start gap-3">
        <Breadcrumbs
          items={[
            { label: "Employees", to: "/employees" },
            { label: notFound ? "Not found" : "Couldn't load" },
          ]}
        />
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
      <section className="flex max-w-3xl flex-col gap-4" aria-busy="true">
        <TextLine className="w-24" />
        {shape === "profile" ? <ProfileSkeleton /> : <FormSkeleton />}
      </section>
    )
  }

  return null
}

function ProfileSkeleton() {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-8 w-56" />
          <TextLine className="w-32" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-28 rounded-lg" />
          ))}
        </div>
      </div>
      <DetailsCardSkeleton />
      <Card aria-hidden="true">
        <CardHeader>
          <Skeleton className="h-5 w-16" />
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <Skeleton className="my-1 h-7 w-44" />
          <TextLine className="w-56" />
        </CardContent>
      </Card>
      <Card aria-hidden="true">
        <CardHeader>
          <Skeleton className="h-5 w-20" />
        </CardHeader>
        <CardContent>
          <TimelineSkeleton />
        </CardContent>
      </Card>
    </>
  )
}

function FormSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <TextLine className="w-24" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </>
  )
}
