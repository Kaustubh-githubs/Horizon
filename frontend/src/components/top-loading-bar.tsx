import { useIsFetching, useIsMutating } from "@tanstack/react-query"
import NProgress from "nprogress"
import { useEffect } from "react"
import { useNavigation } from "react-router"

// The bar alone, no spinner. It starts at 10% and trickles on (up to 6% every 200 ms, about a
// quarter of the way in the first second) until everything has answered, then fills and fades.
// The look (an orange gradient with a glow) is in index.css. `trickleRate` is a real setting in
// nprogress 0.2.0 that its type definitions leave out, hence the wider type.
const settings: Partial<NProgress.NProgressOptions> & { trickleRate: number } =
  {
    showSpinner: false,
    minimum: 0.1,
    trickleSpeed: 200,
    trickleRate: 0.06,
    speed: 300,
  }
NProgress.configure(settings)

/**
 * NProgress across the top of the window whenever the app is loading something: a page's code
 * (Insights is loaded on demand), a request something on screen is waiting for, or a save.
 * Every request goes through TanStack Query, so its counts stand in for "fetch events". A
 * prefetch (hovering a directory row) has nothing on screen waiting, so it doesn't show the bar.
 */
export function TopLoadingBar() {
  const fetching = useIsFetching({
    predicate: (query) => query.getObserversCount() > 0,
  })
  const mutating = useIsMutating()
  const navigating = useNavigation().state !== "idle"
  const busy = fetching + mutating > 0 || navigating

  useEffect(() => {
    if (busy) NProgress.start()
    else NProgress.done()
  }, [busy])

  return null
}
