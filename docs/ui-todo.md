# UI to-do

UI and UX polish we've noticed but are leaving until every flow works end to end (profile, salary changes, insights, budgets). Each item says what's wrong and a likely fix.

## Employee profile and forms
- [x] **Edit page flashes when it opens.** Clicking Edit swaps the page for a loading skeleton while it fetches a fresh copy of the employee (so the form never starts from an old cached version, ADR 0017), then shows the form. Fix: keep the form on screen with the cached values, disabled, and enable it when the fresh copy arrives. Or prefetch the employee when the pointer is over the Edit button. Done in the UI pass (ADR 0022).
- [x] **No warning when leaving a form with unsaved changes.** Back, Cancel or a sidebar link drops what was typed. Fix: React Router's `useBlocker` with a "Discard changes?" dialog when the form is dirty. Done in the UI pass (ADR 0022).
- [x] **Save is enabled before anything changes** on the edit form. Fix: disable it until the form is dirty. Done in the UI pass (ADR 0022).
- [x] **Long dropdowns are slow to search.** Job titles (28) and departments use a plain select. Fix: a searchable combobox (shadcn `Command` in a popover). Done in the UI pass (ADR 0022).
- [x] **Some server messages are fragments.** Errors that don't belong to a field show as "is required" or "has already been taken" with no subject. Fix: turn them into full sentences ("Lock version is required"), or return full messages from the API for `base`. Done (ADR 0022, update): such messages are turned into sentences on the client, with the field named ("Lock version is required.").
- [x] **Native date inputs look different in every browser.** Fix: shadcn's calendar date picker for hire date and last working day. Done (ADR 0022, update): a calendar date picker (react-day-picker) for both.
- [x] **Focus after navigation.** After saving or adding, focus stays on the body. Fix: move focus to the page heading so screen readers announce the new page. Done (ADR 0022, update): the new page's heading takes focus, unless a field on it already has.
- [x] **The last-working-day picker allows any date** (found in testing, 2026-10-31). The server rejects dates in the future or before the hire date or the latest salary change, but only after Submit. Fix: set `min` (the later of hire date and latest salary change) and `max` (today) on the date input. Done in the UI pass (ADR 0022).
- [x] **Server messages show raw ISO dates**, e.g. "can't be before the latest salary change (2026-10-31)". Fix: format the date like the rest of the app ("31 Oct 2026") in the message. Done in the UI pass (ADR 0022).
- [x] **The change-salary amount placeholder is the API's raw string** ("1500000.0"). Fix: show the current salary without the trailing ".0". Done in the UI pass (ADR 0022).

## Salary changes
- [x] **Rupee amounts use Western digit grouping** (₹3,040,176.19 instead of ₹30,40,176.19). Done: INR uses `en-IN` grouping, and summaries use lakh and crore.
- [x] **Peer figures show paise** (average ₹3,040,176.19), which is noise for an indicator. Fix: round averages and medians to whole units in the dialog. Done in the UI pass (ADR 0022).
- [x] **The change dialog's content disappears before its closing animation.** The form unmounts as soon as `open` turns false. Fix: reset the form on open instead of unmounting it. Done in the UI pass (ADR 0022).

## Insights
- [x] **Wide tables scroll sideways on narrow screens.** The segment table has eight columns. Fix: hide lowest/highest below a breakpoint, or a compact card per row. Done (ADR 0022, update): whole-unit figures, and columns give way as the card narrows (lowest and highest, then the quartiles, then the average). Fits at 1,024 px and up; a phone still scrolls a little.
- [x] **Recharts makes the main bundle large** (Vite warns about chunk size). Fix: load the Insights page lazily (`React.lazy` on the route), so other pages don't download the charting library. Done in the UI pass (ADR 0022).
- [x] **Charts have no dark-mode palette** (dark mode is out of scope, but the chart colours are hard-coded light values). Fix: move them to CSS tokens if dark mode is added. Done (ADR 0023): the chart colours are tokens with dark values.
- [x] **The ★ list only links to profiles.** Fix: also offer "Change salary" straight from the row for HR acting on an underpaid case. Done (ADR 0022, update): each row has a Change salary button.
- [x] **"In 0 countries"** on the headcount tile when nobody matches the filters. Fix: "No one matches" instead. Done in the UI pass (ADR 0022).
- [x] **The ★ tile stays at ±40%** while the list's threshold can be changed (e.g. ±30% lists 80 people in Germany, the tile still counts ±40%). It says so, but it reads as a mismatch. Fix: let the tile follow the list's threshold. Done in the UI pass (ADR 0022).

## Directory
- [x] **Only the name opens a profile.** Fix: make the whole row clickable, keeping a real link on the name for keyboard and middle-click. Done in the UI pass (ADR 0022).
- [x] **Profile opens with a skeleton.** Fix: prefetch the employee when hovering a row, or seed the profile from the row's data. Done in the UI pass (ADR 0022).

## General
- [x] **Phone widths are unusable** (found in testing). The sidebar keeps its 240 px, leaving about 135 px for the page at 375 px wide: the Add employee button is cut off and lines wrap word by word. Tablet width (768 px) works. The brief is laptop-first, so this is polish. Fix: below the `md` breakpoint, turn the sidebar into a top bar with a menu sheet. Done (ADR 0022, update): below 768 px a top bar with a menu sheet replaces the sidebar.
- [x] **Loading skeletons don't match the final layout,** so the page jumps when data arrives. Fix: skeletons shaped like the real card and table. Done in the UI pass (ADR 0022).
- [x] **Toasts and banners use slightly different wording styles.** Fix: one pass over all copy once the flows are done. Done (ADR 0022, update): toasts name who or what changed, and conflict messages share one wording.
- [x] **Breadcrumbs** instead of a single back link on nested pages (Employees › Asha Rao › Edit). Done (ADR 0022, update) on the profile, edit and add pages.
- [x] **Dark mode.** Done (ADR 0023): Light and Dark in the sidebar footer, a circle reveal from the bottom-left corner, every colour a token with a dark value, no flash on load.
- [x] **The main bundle is still over Vite's 500 KB warning** (about 770 KB after Insights became a lazy route). Fix: load more routes on demand (budgets, the employee pages), or split vendor code. Done (ADR 0022, update): every page but the directory loads on demand; the main bundle is about 270 KB.
- [x] **September is "Sept" in the browser and "Sep" from the API** (Intl's en-GB vs Ruby's `%b`). Fix: pick one, e.g. format dates in API messages on the client. Done (ADR 0022, update): the client spells out its month names, so both say "Sep".
