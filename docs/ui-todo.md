# UI to-do

UI and UX polish we've noticed but are leaving until every flow works end to end (profile, salary changes, insights, budgets). Each item says what's wrong and a likely fix.

## Employee profile and forms
- [x] **Edit page flashes when it opens.** Clicking Edit swaps the page for a loading skeleton while it fetches a fresh copy of the employee (so the form never starts from an old cached version, ADR 0017), then shows the form. Fix: keep the form on screen with the cached values, disabled, and enable it when the fresh copy arrives. Or prefetch the employee when the pointer is over the Edit button. Done in the UI pass (ADR 0022).
- [x] **No warning when leaving a form with unsaved changes.** Back, Cancel or a sidebar link drops what was typed. Fix: React Router's `useBlocker` with a "Discard changes?" dialog when the form is dirty. Done in the UI pass (ADR 0022).
- [x] **Save is enabled before anything changes** on the edit form. Fix: disable it until the form is dirty. Done in the UI pass (ADR 0022).
- [x] **Long dropdowns are slow to search.** Job titles (28) and departments use a plain select. Fix: a searchable combobox (shadcn `Command` in a popover). Done in the UI pass (ADR 0022).
- [ ] **Some server messages are fragments.** Errors that don't belong to a field show as "is required" or "has already been taken" with no subject. Fix: turn them into full sentences ("Lock version is required"), or return full messages from the API for `base`.
- [ ] **Native date inputs look different in every browser.** Fix: shadcn's calendar date picker for hire date and last working day.
- [ ] **Focus after navigation.** After saving or adding, focus stays on the body. Fix: move focus to the page heading so screen readers announce the new page.
- [x] **The last-working-day picker allows any date** (found in testing, 2026-10-31). The server rejects dates in the future or before the hire date or the latest salary change, but only after Submit. Fix: set `min` (the later of hire date and latest salary change) and `max` (today) on the date input. Done in the UI pass (ADR 0022).
- [x] **Server messages show raw ISO dates**, e.g. "can't be before the latest salary change (2026-10-31)". Fix: format the date like the rest of the app ("31 Oct 2026") in the message. Done in the UI pass (ADR 0022).
- [x] **The change-salary amount placeholder is the API's raw string** ("1500000.0"). Fix: show the current salary without the trailing ".0". Done in the UI pass (ADR 0022).

## Salary changes
- [x] **Rupee amounts use Western digit grouping** (₹3,040,176.19 instead of ₹30,40,176.19). Done: INR uses `en-IN` grouping, and summaries use lakh and crore.
- [x] **Peer figures show paise** (average ₹3,040,176.19), which is noise for an indicator. Fix: round averages and medians to whole units in the dialog. Done in the UI pass (ADR 0022).
- [x] **The change dialog's content disappears before its closing animation.** The form unmounts as soon as `open` turns false. Fix: reset the form on open instead of unmounting it. Done in the UI pass (ADR 0022).

## Insights
- [ ] **Wide tables scroll sideways on narrow screens.** The segment table has eight columns. Fix: hide lowest/highest below a breakpoint, or a compact card per row.
- [x] **Recharts makes the main bundle large** (Vite warns about chunk size). Fix: load the Insights page lazily (`React.lazy` on the route), so other pages don't download the charting library. Done in the UI pass (ADR 0022).
- [ ] **Charts have no dark-mode palette** (dark mode is out of scope, but the chart colours are hard-coded light values). Fix: move them to CSS tokens if dark mode is added.
- [ ] **The ★ list only links to profiles.** Fix: also offer "Change salary" straight from the row for HR acting on an underpaid case.
- [x] **"In 0 countries"** on the headcount tile when nobody matches the filters. Fix: "No one matches" instead. Done in the UI pass (ADR 0022).
- [x] **The ★ tile stays at ±40%** while the list's threshold can be changed (e.g. ±30% lists 80 people in Germany, the tile still counts ±40%). It says so, but it reads as a mismatch. Fix: let the tile follow the list's threshold. Done in the UI pass (ADR 0022).

## Directory
- [x] **Only the name opens a profile.** Fix: make the whole row clickable, keeping a real link on the name for keyboard and middle-click. Done in the UI pass (ADR 0022).
- [x] **Profile opens with a skeleton.** Fix: prefetch the employee when hovering a row, or seed the profile from the row's data. Done in the UI pass (ADR 0022).

## General
- [ ] **Phone widths are unusable** (found in testing). The sidebar keeps its 240 px, leaving about 135 px for the page at 375 px wide: the Add employee button is cut off and lines wrap word by word. Tablet width (768 px) works. The brief is laptop-first, so this is polish. Fix: below the `md` breakpoint, turn the sidebar into a top bar with a menu sheet.
- [x] **Loading skeletons don't match the final layout,** so the page jumps when data arrives. Fix: skeletons shaped like the real card and table. Done in the UI pass (ADR 0022).
- [ ] **Toasts and banners use slightly different wording styles.** Fix: one pass over all copy once the flows are done.
- [ ] **Breadcrumbs** instead of a single back link on nested pages (Employees › Asha Rao › Edit).
- [ ] **Dark mode** (asked for on 2026-10-31, for later). The shadcn tokens already have `.dark` values. What's left:
  - a theme toggle in the sidebar footer: light, dark or system, remembered per browser
  - the hard-coded colours (about 19 uses: amber warnings, emerald increases, the ★ star, the chart's hex values) moved to tokens with dark values
  - dark values for the loading bar's gradient
  - a check of every page in both themes
  - a short ADR
- [ ] **The main bundle is still over Vite's 500 KB warning** (about 770 KB after Insights became a lazy route). Fix: load more routes on demand (budgets, the employee pages), or split vendor code.
- [ ] **September is "Sept" in the browser and "Sep" from the API** (Intl's en-GB vs Ruby's `%b`). Fix: pick one, e.g. format dates in API messages on the client.
