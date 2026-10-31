# 0022. UI feedback and navigation

Status: Accepted · 2026-10-31

## Context
With every flow working end to end, a pass through the app (docs/ui-todo.md) found gaps in how it feels to use: Sign out sat below a long page, filters scrolled away, nothing showed that a slow call was under way, a profile opened scrolled down if the directory had been, Next left you at the bottom of the new page, forms dropped typed changes without asking, and long dropdowns (28 job titles) had no search.

## Decision
- **The window scrolls, the sidebar doesn't.** The sidebar is `sticky` at full height, so the user and Sign out are always at its foot. The page keeps scrolling in the window (not in its own box), so the browser and React Router can restore it.
- **Scroll restoration** (React Router's `ScrollRestoration`): a new page opens at the top, Back and Forward return to where you were. Filter and option changes on the directory and Insights pass `preventScrollReset`, because they show the same page with other rows. Changing the directory's page scrolls to the top, since Next is at the bottom.
- **Sticky filters** on the directory (with its count line) and Insights. The title scrolls away to save height on a laptop. A line and a shadow appear only once the bar is stuck.
- **A top loading bar, NProgress** (as in Next.js apps), in an orange gradient with a glow at its leading edge (styled in index.css with our tokens; nprogress.css isn't imported). It runs on every page, sign-in included, whenever the app loads something: a page's code (Insights is a lazy route), a request something on screen is waiting for, or a save. Every request goes through TanStack Query, so its fetching and mutating counts stand in for "fetch events"; a prefetch has no observer, so it doesn't show the bar. It starts at once (a fast answer is a short sweep), trickles up to 6% every 200 ms, then fills and fades. A first version was hand-written and appeared only after 150 ms, so locally (50–90 ms answers) it was rarely seen; the product owner asked for NProgress itself, always visible.
- **Headline numbers roll in once** (Insights tiles, budget tiles, the directory count): the digits roll up from zero like an odometer (NumberFlow) the first time each number shows after the app loads or a hard refresh. Coming back to the page or changing a filter shows the new number straight away. A first version counted up on every load and filter change, re-rendering the formatted text each frame, so the width jumped and rupees switched from lakh to crore on the way; the product owner found it busy. Now the number rolls in its final unit ("₹0 Cr" to "₹6,021.83 Cr"), from the same formatting parts as the plain text (`compactMoney`), so it ends exactly as the figure reads elsewhere. Screen readers get a plain copy of the final value, and the motion is skipped when the OS asks for reduced motion.
- **Insights loads on demand** (a lazy route), so other pages don't download the charting library. The current page stays on screen, with the loading bar, until it's ready. The main bundle went from about 1.1 MB to 770 KB (with the new dependencies below).
- **The whole directory row opens the profile**, with the name kept as a real link for the keyboard and new tabs. A pointer resting on a row for 100 ms prefetches the profile and timeline, so it usually opens without a skeleton.
- **Forms ask before losing changes** (React Router's `useBlocker` plus the browser's own prompt on reload). The edit form's Save is disabled until something changes. The edit page shows the cached employee, not editable, while it loads the latest version (ADR 0017), instead of a skeleton.
- **Searchable pickers** for job titles and departments (shadcn's Command, built on `cmdk`), in the forms, the promotion dialog and the filters. Matching is "contains", not cmdk's fuzzy default, which offered Marketing and Design for "eng".
- **Smaller fixes:** placeholders shaped like the real cards and tables; the last-working-day picker limited to the hire date or latest salary change through today; the API's messages write dates the way the UI does ("8 Sep 2022"); peer averages and medians in whole rupees; the salary dialog keeps its content through the closing animation.

## Options considered
- **`<main>` as its own scroll box.** Also keeps the sidebar in place, but the browser can't restore the scroll position, and sticky offsets get harder.
- **Scroll positions keyed by path.** Keeps filter changes in place without touching the filter hooks, but opening a page from the sidebar brought back where you last left it instead of its top. Found in the browser check and replaced.
- **A hand-written loading bar.** About 50 lines and no dependency, but NProgress is the look people know, and its trickle is already tuned.
- **Counting up by hand** (requestAnimationFrame, formatting every frame). No dependency, but the width jumps as digits are added and the unit changes mid-count. NumberFlow takes a prefix and suffix, so it can keep our lakh and crore.
- **Rolling on every change.** Feedback that a filter applied, but busy on a page HR clicks around in; the dimmed "refreshing" state and the loading bar already say it.
- **Fixing the filter row and title together.** About 140 px always taken on a laptop screen.

## Consequences
- Good: the app shows what it's doing, keeps your place, and doesn't lose typing.
- Cost: three new dependencies (`cmdk`, `nprogress`, `@number-flow/react`). nprogress hasn't had a release since 2015, but it's small and stable. The main bundle is still over Vite's 500 KB warning, so more routes could be loaded on demand.
- Cost: the bar shows for background refreshes too (TanStack Query refetches when the window regains focus), a short sweep each time.
