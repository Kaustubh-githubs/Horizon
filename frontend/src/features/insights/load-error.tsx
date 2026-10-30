import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api"

/**
 * What a dashboard card shows when its figures fail to load. An unknown country (a 404, e.g.
 * from an old or edited link) offers to show every country, since retrying can't help.
 */
export function LoadError({
  error,
  what,
  onRetry,
  onShowAllCountries,
}: {
  error: unknown
  what: string
  onRetry: () => void
  onShowAllCountries: () => void
}) {
  const unknownCountry = error instanceof ApiError && error.status === 404

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      {unknownCountry
        ? "That country isn't in Horizon."
        : `Couldn't load ${what}.`}
      <Button
        variant="outline"
        size="sm"
        onClick={unknownCountry ? onShowAllCountries : onRetry}
      >
        {unknownCountry ? "Show all countries" : "Try again"}
      </Button>
    </div>
  )
}
