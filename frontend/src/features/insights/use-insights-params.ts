import { useSearchParams } from "react-router"

import type { SegmentBy } from "@/features/insights/api"

const SEGMENTS: SegmentBy[] = ["country", "department", "job_title", "tenure"]
/** The thresholds HR can pick, in %. The API accepts 20–50 and uses 40 for anything else. */
export const THRESHOLDS = ["20", "25", "30", "35", "40", "45", "50"]
export const DEFAULT_THRESHOLD = "40"
const DIRECTIONS = ["all", "below", "above"]

// A value from the URL, or the default when it isn't one we offer (an old or edited link),
// so the page never describes a filter the API isn't applying.
const oneOf = (
  value: string | undefined,
  allowed: string[],
  fallback: string,
) => (value && allowed.includes(value) ? value : fallback)

/**
 * The dashboard's choices live in the URL, like the directory's, so a refresh or a shared
 * link shows the same view. Segments and outliers have their own filters: `by` and `country`
 * for the segment table, `ocountry`, `direction`, `threshold` and `opage` for the ★ list.
 */
export function useInsightsParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const get = (key: string) => searchParams.get(key) ?? undefined

  const requestedBy = get("by") as SegmentBy | undefined
  const params = {
    by: requestedBy && SEGMENTS.includes(requestedBy) ? requestedBy : "country",
    country: get("country"),
    outlierCountry: get("ocountry"),
    direction: oneOf(get("direction"), DIRECTIONS, "all"),
    threshold: oneOf(get("threshold"), THRESHOLDS, DEFAULT_THRESHOLD),
    outlierPage: get("opage"),
  }

  // Changing an outlier filter goes back to its first page.
  const update = (changes: Record<string, string | undefined>) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        if (
          !("opage" in changes) &&
          Object.keys(changes).some((key) =>
            ["ocountry", "direction", "threshold"].includes(key),
          )
        )
          next.delete("opage")
        return next
      },
      { replace: true },
    )

  return { params, update }
}
