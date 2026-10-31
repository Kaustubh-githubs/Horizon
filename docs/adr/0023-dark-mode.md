# 0023. Dark mode

Status: Accepted · 2026-10-31

## Context
Dark mode started out of scope (docs/requirements.md), and the UI pass (ADR 0022) logged it for later. The product owner then asked for it before the first deploy. shadcn's colour tokens already had dark values, but about 20 colours were written straight into components: amber warning boxes, green increases, the ★, the budget status colours and the chart's hex values.

## Decision
- **Two choices, Light and Dark**, as two icon buttons in the sidebar footer.
  - Until the user picks one, the app uses the device's theme (and follows it if it changes).
  - The pick is remembered per browser (`localStorage`). Without storage (a private window, blocked site data), it isn't remembered, and the next visit starts from the device's theme again.
- **The new theme spreads as a circle from the bottom-left corner towards the top right** until it covers the page, in about 0.65 s. (It started from the top-right corner at first; the product owner preferred the bottom left.)
  - It uses the View Transitions API: the browser snapshots the old page and reveals the new one through a growing circular clip.
  - Browsers without the API, and anyone who asks the OS for reduced motion, get an instant switch.
- **No flash on load.** A few lines in `index.html` apply the theme before the first paint, using the same storage key as `src/lib/theme.ts`, which keeps it up to date afterwards. The page's `color-scheme` is set too, so native controls (date pickers, scrollbars) match.
- **Every colour is a token** in `index.css`, with its own dark value, instead of a fixed colour in a component:
  - `positive` (pay going up), `star` and `star-fill`
  - `warning`, `warning-border` and `warning-foreground`
  - `status-good`, `status-warning` and `status-critical` (budgets)
  - the chart's `chart-*` colours
  - the loading bar's gradient
- **Dark values are chosen, not flipped.** On the dark card, the chart's middle-half bar steps back (darker blue) and the median dot is the bright one, so the median still reads first. Both pairs pass the dataviz palette validator (one hue, clear steps, the lighter mark visible against the card). Status colours and the increase green use lighter shades that read on dark.
- **Toasts follow the theme** (Sonner takes light or dark).
- **The timeline's icon colours stay as they are.** They're strong colours with white icons, which read on both backgrounds; checked in the browser.

## Options considered
- **`next-themes`.** The usual React package for this, but it's built for Next.js, and in a single-page app its own script only runs once the bundle loads. A two-line script in `index.html` avoids the flash with no dependency.
- **A third choice, "Match the system".** Built first, then dropped: the product owner wanted just Light and Dark. The device's theme is still the starting point until someone picks.
- **A single button that toggles.** Smaller, but you can't see both choices or which one is on.
- **Dark only when the system is dark** (no switch). Simplest, but some people want the app in a theme other than their OS.
- **A plain switch or the browser's default cross-fade.** Fine, but the reveal from the corner makes the change feel deliberate. It costs little, since the browser does the animation.

## Consequences
- Good: every page reads in both themes, and new colours have an obvious home (a token with two values).
- Cost: new colours must be added as tokens, never written into a component, or they'll be wrong in one of the themes.
