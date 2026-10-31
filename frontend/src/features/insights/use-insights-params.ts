import { useSearchParams } from "react-router"

import type { InsightFilters, SegmentBy } from "@/features/insights/api"

const SEGMENTS: SegmentBy[] = ["country", "department", "job_title", "tenure"]
/** The thresholds HR can pick, in %. The API accepts 20–50 and uses 40 for anything else. */
export const THRESHOLDS = ["20", "25", "30", "35", "40", "45", "50"]
export const DEFAULT_THRESHOLD = "40"
const DIRECTIONS = ["all", "below", "above"]

/** Sets every page filter back to "all". */
export const NO_FILTERS: Record<keyof InsightFilters, undefined> = {
  country: undefined,
  department_id: undefined,
  job_title_id: undefined,
  tenure: undefined,
}
const FILTER_KEYS = Object.keys(NO_FILTERS)

// A value from the URL, or the default when it isn't one we offer (an old or edited link),
// so the page never describes a filter the API isn't applying.
const oneOf = (
  value: string | undefined,
  allowed: string[],
  fallback: string,
) => (value && allowed.includes(value) ? value : fallback)

/**
 * The dashboard's choices live in the URL, like the directory's, so a refresh or a shared
 * link shows the same view. `country`, `department_id`, `job_title_id` and `tenure` are the
 * page's filters, applied to every part of it (ADR 0019); `by` groups the segment table;
 * `direction`, `threshold` and `opage` belong to the ★ list.
 */
export function useInsightsParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const get = (key: string) => searchParams.get(key) ?? undefined

  const requestedBy = get("by") as SegmentBy | undefined
  const params = {
    filters: {
      // Uppercase, like the filter's options: a typed or older link with "us" still shows it picked.
      country: get("country")?.toUpperCase(),
      department_id: get("department_id"),
      job_title_id: get("job_title_id"),
      tenure: get("tenure"),
    } satisfies InsightFilters,
    by: requestedBy && SEGMENTS.includes(requestedBy) ? requestedBy : "country",
    direction: oneOf(get("direction"), DIRECTIONS, "all"),
    threshold: oneOf(get("threshold"), THRESHOLDS, DEFAULT_THRESHOLD),
    outlierPage: get("opage"),
  }

  // Changing a filter, or what the ★ list shows, goes back to its first page.
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
            [...FILTER_KEYS, "direction", "threshold"].includes(key),
          )
        )
          next.delete("opage")
        return next
      },
      // The same page with other choices, so the scroll position stays.
      { replace: true, preventScrollReset: true },
    )

  return { params, update }
}
