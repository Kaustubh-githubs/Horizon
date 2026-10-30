import { CompassIcon, TriangleAlertIcon, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { isRouteErrorResponse, Link, useRouteError } from "react-router"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function describe(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`
  if (error instanceof Error) return `${error.name}: ${error.message}`
  return String(error)
}

/** Layout shared by the not-found and error screens. */
function ProblemScreen({
  icon: Icon,
  title,
  description,
  fullPage,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  fullPage: boolean
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        fullPage && "flex min-h-svh items-center justify-center p-4",
      )}
    >
      <section
        role="alert"
        className="flex max-w-lg flex-col items-start gap-3"
      >
        <Icon className="size-6 text-muted-foreground" />
        <h1 className="font-heading text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
        {children}
      </section>
    </div>
  )
}

const goToEmployees = (
  <Button variant="outline" asChild>
    <Link to="/employees">Go to employees</Link>
  </Button>
)

/** For addresses that match no page: the catch-all route and route-level 404s. */
export function NotFound({ fullPage = false }: { fullPage?: boolean }) {
  return (
    <ProblemScreen
      icon={CompassIcon}
      title="Page not found"
      description="Check the address, or go back to the employee list."
      fullPage={fullPage}
    >
      {goToEmployees}
    </ProblemScreen>
  )
}

/**
 * Shown by React Router when a page throws while rendering or loading, instead of its
 * developer-only default screen. Inside the app shell it replaces just the page, so the
 * navigation stays usable; `fullPage` is for errors outside the shell (login, the auth check).
 */
export function RouteError({ fullPage = false }: { fullPage?: boolean }) {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404)
    return <NotFound fullPage={fullPage} />

  return (
    <ProblemScreen
      icon={TriangleAlertIcon}
      title="Something went wrong"
      description="This page hit an unexpected problem. Reloading usually fixes it. If it keeps happening, go back to the employee list and try again."
      fullPage={fullPage}
    >
      <div className="flex gap-2">
        <Button onClick={() => window.location.reload()}>Reload page</Button>
        {goToEmployees}
      </div>
      {/* The technical detail helps while developing; users don't need it. */}
      {import.meta.env.DEV && (
        <pre className="w-full overflow-x-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
          {describe(error)}
        </pre>
      )}
    </ProblemScreen>
  )
}
