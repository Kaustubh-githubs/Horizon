import { useEffect, useRef } from "react"

// A page's heading can arrive after its data does (a profile shows a placeholder first), so it's
// looked for on each frame for up to this long.
const WAIT_FRAMES = 180

/**
 * After moving to another page, focuses its heading, so a screen reader announces the new page
 * and keyboard users carry on from the top of it. Not on the first page load, where the browser
 * starts at the top anyway, and not when something on the new page already has focus (a form's
 * first field, with autoFocus).
 */
export function useFocusPageHeading(pathname: string) {
  const shownPath = useRef(pathname)

  useEffect(() => {
    if (shownPath.current === pathname) return
    shownPath.current = pathname

    let frames = 0
    let frame = requestAnimationFrame(function focusHeading() {
      const main = document.querySelector("main")
      const focused = document.activeElement
      if (focused && focused !== document.body && main?.contains(focused))
        return
      const heading = main?.querySelector<HTMLElement>("h1")
      if (heading) {
        heading.tabIndex = -1
        heading.focus({ preventScroll: true })
      } else if (++frames < WAIT_FRAMES) {
        frame = requestAnimationFrame(focusHeading)
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [pathname])
}
