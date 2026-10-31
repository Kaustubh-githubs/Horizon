import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api"

/**
 * What a part of a page shows when its data fails to load: what's missing and a retry. With
 * `notFound`, a 404 (on the insights page: a filter value from an old or edited link) offers that
 * action instead, because retrying can't help.
 */
export function LoadError({
  error,
  what,
  notFound,
  onRetry,
}: {
  error?: unknown
  what: string
  notFound?: { message: string; action: string; onAction: () => void }
  onRetry: () => void
}) {
  const missing =
    notFound !== undefined && error instanceof ApiError && error.status === 404

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      {missing ? notFound.message : `Couldn't load ${what}.`}
      <Button
        variant="outline"
        size="sm"
        onClick={missing ? notFound.onAction : onRetry}
      >
        {missing ? notFound.action : "Try again"}
      </Button>
    </div>
  )
}
