# How AI was used to build Horizon

Horizon was built from 27 October to 1 November 2026 by one developer working with **Claude Code** (Anthropic's coding agent, in the Claude desktop app). This document says what the AI did, what the developer decided, how its output was checked, and where it was wrong.

**At a glance:**
- 41 pull requests and 86 commits, in the history as they happened (merged without squashing).
- 413 backend specs and 44 frontend tests.
- 26 decision records ([docs/adr/](adr/README.md)), two of them superseded when a decision changed.
- Live at [horizon-0owa.onrender.com](https://horizon-0owa.onrender.com).

Commits carry no AI co-author lines; that was the developer's choice. This document is where the AI's part is disclosed instead.

## How the work was split

| | The developer | Claude |
|---|---|---|
| **Product** | Decided scope, priorities and every trade-off; pushed back on features that weren't earning their place | Proposed 2–3 options with pros and cons for each, and recommended one |
| **Decisions** | Picked an option, or a different one | Wrote each decision up as an ADR, including the options turned down |
| **Code** | Reviewed every PR and merged it | Wrote the code, the specs and the tests, ran the checks |
| **Testing** | Tried the app, sent screenshots of what looked wrong | Ran the suites, checked every change in a browser, did an end-to-end test pass and a code review |
| **Git** | Committed and pushed for most of the project; later let Claude create branches and PRs | Wrote commit messages and PR descriptions |
| **Accounts and secrets** | Signed in to Render and GitHub, pasted the Rails master key | Never handled passwords, keys or sign-ins |

The rules both followed are in [CONVENTIONS.md](../CONVENTIONS.md), written for "a person or an AI tool". The main ones:
- Discuss before building.
- Make one focused change at a time.
- Write a failing test first for business rules.
- Add no dependency without asking.
- Don't quietly work against an ADR.

## How a feature was built

Each feature followed the same loop, which the PR history shows:

1. **The developer asked** for a feature or a fix, often with a screenshot.
2. **Claude laid out options**, and the developer chose one.
3. **Claude wrote the most important specs first** and showed them failing: the salary sync, the insights maths, session expiry, and so on.
4. **Claude built the feature until the specs passed**, then ran RuboCop, Brakeman, bundler-audit, RSpec, TypeScript, ESLint and the frontend tests.
5. **Claude checked the change in a real browser**, sometimes also in production mode.
6. **The developer reviewed the PR and merged it.**

## Decisions the developer made

Some of the developer's prompts, in substance, and what changed because of them:

- **"Is this feature required, or are we just building it for the sake of it?"** Claude had designed department budgets per country. The developer cut them to one INR budget per department (ADR 0020). That was simpler to build, to explain and to demo.
- **"Check the insights are calculated correctly when filters change."** Claude wrote SQL independent of the app's own queries and compared 130 figures across 9 filter combinations: no differences.
- **"Do an intense test of the whole app."** This found five real bugs (listed below).
- **"Do a proper code review: SQL attacks, Rails best practices, what an interviewer would point out."** This found 15 issues, all fixed in #34–#36.
- **Audit trail scope:** audits for employees and salaries first, budgets later. The timeline came from a screenshot the developer liked.
- **The UI:**
  - the insights filters apply to the whole page
  - an NProgress loading bar in orange
  - headline numbers that roll in once per load, not on every change
  - only Light and Dark (no "system" option), with the new theme spreading from the bottom-left corner
- **Hosting:** Railway first, then Render, when Railway paused new sign-ups.

## How AI output was kept honest

- **Specs before code** for the business rules, shown failing first.
- **An independent check of the numbers:** the insights maths was recomputed with differently written SQL (`age()` instead of date arithmetic, a correlated subquery instead of `LAG`).
- **Every UI change checked in a browser**, by reading the page and measuring it, not only by looking at a screenshot.
- **A self-review** of the whole codebase at high effort, with findings reported before any fix.
- **A colour validator** for the chart palettes, and computed contrast ratios for the brand colours, instead of judging by eye.
- **Claims checked against the code:** README and ADR statements were verified before they were committed (see the corrections below).

## Where the AI was wrong, and how it was caught

### Caught by tests
- **Employee codes from a Postgres sequence** (ADR 0013) broke the test database: `schema.rb` doesn't record the sequence. Replaced by a column generated from the row's id (ADR 0014).
- **The `audited` gem's generator** used integer ids; the migration was rewritten with bigint.
- **A spec helper named `change`** shadowed RSpec's own matcher; it was renamed.
- **The first light-mode chart colours** failed the palette validator against the white card (1.69:1); they were stepped darker.

### Caught by the AI's own testing pass
Five bugs in its own earlier code, found by trying edge cases against the running app:
1. A salary of 1,200,000.999 was silently saved as 1,200,001.00. Now refused.
2. Signing in without a password returned a 500 error. Now a 401.
3. An impossible date (30 February) was reported as "can't be blank". Now "is not a valid date".
4. Names and emails had no length limit (a 5,000-character name was accepted).
5. A malformed JSON body returned Rails' HTML error page instead of the API's error shape.

### Caught by the AI's code review
15 issues in its own earlier work, including:
- login sessions that never expired
- salaries written to the production logs
- CSRF protection that relied on SameSite alone
- only 4 of 13 endpoints tested for requiring sign-in
- a 401 on a save that didn't send the user to sign in
- no frontend tests at all

All were fixed, with specs.

### Caught in the browser before shipping
- **Scroll restoration:** the first version brought back an old scroll position when a page was opened from the sidebar. Switched to resetting on new pages and keeping the position only on filter changes.
- **The cross-site write check** blocked the app's own saves: Vite's dev proxy rewrote the `Host` header, so Rails thought the page came from another site. Found by sending a real save from the browser. The proxy now forwards the original host.
- **The theme reveal circle** landed at half the intended position on a 2× pixel-density screen, because it used pixel coordinates. Switched to percentages.
- **A skipped theme animation** left an unhandled promise rejection in the console.

### Caught by the developer
- **The chart tooltip** was clipped by its card (from a screenshot).
- **Job titles** didn't follow the selected department.
- **The first loading bar** waited 150 ms before showing, so on fast local calls it was never seen. The developer asked for NProgress.
- **The first animated numbers** re-ran on every filter change and switched units mid-count (lakh to crore). The developer found them distracting; they now roll once per load, in their final unit.
- **Railway** paused new sign-ups after the deploy was built for it. The deployment moved to Render (ADR 0026).

### Wrong claims in the documentation
- **The README merged in #29** described features that didn't exist: a "Global USD view", ~5,000 job titles, Vitest tests, a missing setup guide. A status review caught it; every claim was checked against the code, and it was rewritten (#32).
- **An ADR draft** said every new test had been checked to fail without its fix. Only one had been. The sentence was corrected before it was committed.

### Process mistakes
- **Stacked pull requests:** four PRs each targeted the previous PR's branch. When they were merged quickly, three of them landed in those branches and never reached master. A catch-up PR (#37) fixed it, and every PR now targets master with the merge order written in its description.

## What the AI was not allowed to do

- Sign in to accounts, or enter passwords, keys or tokens. The developer signed in to Render and GitHub and pasted the master key.
- Delete anything, or merge, without the developer's say-so. It deleted one failed Render service only after an explicit "yes".
- Commit or push without being asked. For most of the project the developer ran the commits from the commands Claude gave.

## Lessons

- **Ask for options, not answers.** The best calls (budgets per department, whole-page filters, Render over waiting for Railway) came from the AI laying out trade-offs and the developer choosing. Several were simpler than the AI's first proposal.
- **Make the AI test its own work against reality.** Unit tests caught some bugs; running the app in a browser, in production mode, and through an independent SQL check caught more.
- **Have it review itself, then fix with specs.** The review found real security gaps that every check had passed.
- **Verify claims, not just code.** Documentation written by an AI is as likely to be wrong as its code, and needs the same checking.
