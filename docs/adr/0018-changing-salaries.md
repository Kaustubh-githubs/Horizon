# 0018. Changing salaries

Status: Accepted · 2026-10-30

## Context
HR records raises, promotions, market adjustments and corrections. Each one adds to the salary history and becomes the current salary (ADR 0004), taking effect on the day it's recorded (ADR 0005). Pay changes are where costly mistakes happen: an extra zero, a raise typed as a cut, or a promotion whose title never gets updated.

## Decision
- **One service, `SalaryRevisions::Create`,** records a change. In one transaction it saves the revision and updates the employee's current salary (and job title, for a promotion). The effective date is today, the UTC date (ADR 0017), and the currency comes from the employee's country.
- **Conflicts:** the request carries the `lock_version` the page loaded. If the employee changed in the meantime (another salary change, an edit), the employee update fails and the revision is rolled back with it, and the API answers 409. No extra row lock is needed: the version check makes the second of two concurrent changes fail.
- **Rules:**
  - The reason is `annual_raise`, `promotion`, `market_adjustment` or `correction`. `hire` is only used when an employee is added.
  - The amount must differ from the current salary. It can go up or down for any reason, because real pay cuts and corrections happen.
  - A promotion must move the employee to a different job title (seniority lives in the title, ADR 0003). Other reasons can't change the title.
  - The edit form can still change the title, to fix a title entered wrongly. It isn't for promotions: it changes neither pay nor history, and the form says to use Change salary → Promotion instead.
  - Former employees can't get changes (ADR 0017), and amounts must fit the money column (ADR 0006).
  - Several changes on the same day are allowed, for example a raise and then a correction. They're ordered by when they were recorded.
  - A change can never be dated before the employee's latest one (checked in `SalaryRevision`), so the latest revision is always the current salary.
- **History** (`GET /employees/:id/salary_revisions`) listed every change newest first, with the previous amount and the % change. It isn't paged: an employee has a handful of rows. (Removed on 2026-11-01: the timeline, ADR 0021, shows the history, and nothing called this any more.)
- **Help against mistakes, in the change dialog:**
  - It shows the current salary, the new one and the % change.
  - It shows the **average and median salary for the same job title in the same country** (active employees, excluding the person themself) with the head count, from `GET /employees/:id/pay_comparison`. For a promotion, the figures are for the new title, and appear once it's picked.
  - It **warns** when the change is more than ±50%, or the new salary is more than 50% away from that average. The warnings don't block saving: big promotions and corrections are real, and HR decides.

## Options considered
- **Only corrections may lower pay.** Catches a cut typed by mistake, but real cuts under other reasons would have to be mislabelled.
- **A hard limit on big changes.** Safest against typos, but blocks legitimate promotions and corrections.
- **A required confirmation for big changes, checked by the API too.** Stronger, but more friction than a single HR user needs. The warning can become a required confirmation later.
- **Changing the title separately from the promotion.** Simpler, but pay and title could disagree.
- **A row lock (`with_lock`) while saving.** Prevents overlap too, but reloading the row would discard the client's `lock_version`, so we'd lose the "someone else changed this" check.

## Consequences
- Good: current salary, title and history always agree, because one transaction writes them.
- Good: the dialog puts the number in context (the old salary, the % change, what peers earn), which is where an extra zero gets noticed.
- Cost: the peer average is a live query on every dialog open. It uses the `(country_id, job_title_id)` index and covers at most a few hundred rows, so it's cheap at this scale.
- Cost: warnings can be clicked past. If that proves risky, we add a required confirmation.
