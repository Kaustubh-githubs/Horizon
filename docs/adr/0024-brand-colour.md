# 0024. Brand colour

Status: Accepted · 2026-11-01

## Context
After dark mode (ADR 0023) the app was all greys, apart from data colours (statuses, the chart) and the orange loading bar. The product owner asked for colour, in the loading bar's orange, so the app has its own look.

## Decision
- **The loading bar's orange is Horizon's brand colour**, as tokens with a light and a dark value (`index.css`):
  - `primary`: buttons, focus rings and other shadcn "primary" uses.
  - `brand`: marks with no text on them.
  - `brand-soft`: the background of something picked.
  - `brand-strong`: orange text.
- **Readable first.** White text on the bar's bright orange (`#ea580c`) is only 3.6:1, below the 4.5:1 that normal text needs. So in light mode, buttons and orange text use orange-700 (`#c2410c`, 5.2:1 with white). In dark mode they use the bar's own `#f97316` with dark text (6.4:1). The bright gradient goes only where nothing has to be read: the mark, the bar, the tiles' top edge, the active nav item's marker.
- **Where it shows:**
  - a brand mark (a sun rising over the horizon, in the bar's gradient) in the sidebar, on the sign-in card and as the favicon, replacing Vite's default logo
  - the current page in the sidebar: tinted, with an orange marker
  - primary buttons and focus rings
  - filters that are narrowing the page: tinted, so you can see which are on
  - a thin gradient line along the top of the headline tiles (Insights, Budgets)
  - the pay-spread chart: orange instead of blue (one hue, two shades, checked with the dataviz palette validator in both themes)
  - the theme switch's picked icon, link hovers in the directory, and selected text
- **Status colours don't change.** Budgets keep green, amber and red, with an icon and a label, so they stay distinct from the brand.

## Options considered
- **The bright orange for buttons, with white text.** Matches the bar exactly, but the text fails contrast.
- **The bright orange for buttons, with dark text.** Readable, but dark-on-orange buttons look heavy in light mode. Dark mode uses this, where it fits.
- **Orange only on the mark.** Very safe, but the app would still feel grey, which is what the product owner wanted changed.

## Consequences
- Good: the app has a recognisable look, tied to the loading bar, in both themes.
- Cost: orange sits close to the amber "near the limit" status. The status always comes with its icon and label, so it's never told apart by colour alone.
