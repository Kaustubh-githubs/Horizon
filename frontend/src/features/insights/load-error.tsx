import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api"

/**
 * What a dashboard card shows when its figures fail to load. A 404 means a filter value from
 * the link doesn't exist (an old or edited link), so it offers to drop the filters instead of a
 * retry that can't help. Each card says which filters that means.
 */
export function LoadError({
  error,
  what,
  notFound,
  onRetry,
}: {
  error: unknown
  what: string
  notFound: { message: string; action: string; onAction: () => void }
  onRetry: () => void
}) {
  const missing = error instanceof ApiError && error.status === 404

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
