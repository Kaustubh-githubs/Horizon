import { useSyncExternalStore } from "react"
import { flushSync } from "react-dom"

export type Theme = "light" | "dark"

// Also read by the script in index.html, which applies the theme before the first paint.
const STORAGE_KEY = "horizon-theme"
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)")
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
const listeners = new Set<() => void>()

// What the user picked, if anything. Storage can be unavailable (private windows, blocked site
// data); then nothing is remembered.
function readPicked(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === "light" || stored === "dark" ? stored : null
  } catch {
    return null
  }
}

let picked = readPicked()
// Until the user picks one, the device's theme.
const resolve = (): Theme => picked ?? (darkQuery.matches ? "dark" : "light")
let theme = resolve()

/** Puts the `dark` class (the tokens in index.css) and the native color scheme on <html>. */
function apply() {
  document.documentElement.classList.toggle("dark", theme === "dark")
  document.documentElement.style.colorScheme = theme
}

function show(next: Theme) {
  theme = next
  apply()
  // Synchronously, so the switch is already right in the new theme's snapshot.
  flushSync(() => listeners.forEach((listener) => listener()))
}

// How long the new theme takes to cover the page.
const REVEAL_MS = 650

/**
 * Switches theme. The new one spreads as a circle from the bottom-left corner towards the top
 * right until it covers the page (the View Transitions API: the browser snapshots the old
 * page, and the new one is revealed through a growing clip). Without that API, or with reduced
 * motion asked for, it just switches.
 */
export function setTheme(next: Theme) {
  picked = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Not remembered, but still applied for this visit.
  }
  if (next === theme) return

  if (!document.startViewTransition || reducedMotion.matches) {
    show(next)
    return
  }
  const transition = document.startViewTransition(() => show(next))
  void transition.ready.then(() => {
    // From the bottom-left corner (0% 100%) to the farthest one, the top right. In percentages
    // of the snapshot, so it doesn't depend on the screen's pixel density: a circle's % radius
    // is of the box's diagonal ÷ √2, so 141.5% reaches the opposite corner.
    document.documentElement.animate(
      {
        clipPath: ["circle(0% at 0% 100%)", "circle(141.5% at 0% 100%)"],
      },
      {
        duration: REVEAL_MS,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        pseudoElement: "::view-transition-new(root)",
      },
    )
  })
}

// index.html has already applied it; again here, so this module doesn't depend on that script.
apply()

// Until the user picks a theme, follow the device when it switches.
darkQuery.addEventListener("change", () => {
  if (!picked) show(resolve())
})

/** The theme on screen, kept in step with the switch. */
export function useTheme(): Theme {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => theme,
  )
}
