import { QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router"

import "./index.css"
import { Toaster } from "@/components/ui/sonner"
import { queryClient } from "@/lib/query-client"
import { router } from "@/router"

// After a deploy, a tab that was already open asks for the old build's page files (pages load on
// demand), and those are gone. Vite reports it as `vite:preloadError`; loading the page afresh
// fetches the new build. It's the page being opened, since React Router changes the URL only once
// the page's code has arrived. At most once a minute, so a page file that's really broken shows
// its error instead of reloading in a loop.
const RELOADED_AT = "horizon.reloadedForNewBuild"
window.addEventListener("vite:preloadError", (event) => {
  try {
    if (Date.now() - Number(sessionStorage.getItem(RELOADED_AT)) < 60_000)
      return
    sessionStorage.setItem(RELOADED_AT, String(Date.now()))
  } catch {
    return // no session storage: show the error rather than risk a loop
  }
  event.preventDefault()
  const opening = router.state.navigation.location
  if (opening) window.location.assign(router.createHref(opening))
  else window.location.reload()
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
)
