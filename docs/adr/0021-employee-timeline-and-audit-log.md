# 0021. Employee timeline and audit log

Status: Accepted · 2026-10-31

## Context
The employee profile showed two lists: the salary history table (ADR 0018) and a change history card built from the audit trail (ADR 0012). HR reads a person's story by date ("when did she move to Product, when was she promoted?"), which neither list told on its own. HR (and anyone checking the data) also wants the complete record of every saved change, column by column, which the grouped change history hid.

## Decision
- **One timeline** replaces both lists on the profile. Events, newest first, grouped by year:
  - **Joined ACME**, on the hire date, with the starting salary (from the `hire` revision). The starting job title and department are shown only when they're known, i.e. the employee was added in the app and the audit trail recorded them.
  - **Salary revised**, one per salary revision except the hire, on its effective date, from the previous amount to the new one, with the % change and the reason. A **promotion** is its own event and, when the audit trail has it, also shows the old and new job title.
  - **Department changed** and **job title changed** (outside a promotion), from the audit trail, on the day they were recorded (the UTC date, ADR 0005, 0017).
  - **Employment ended**, on the last working day.
  - **Work anniversaries**, worked out from the hire date each year up to today or the last working day. Nothing is stored.
  - Changes on the same day are in the order they were recorded, so the story reads in the order things happened.
  - A promotion's new title is found through the audit trail: the salary revision and the title change are saved as one change. Adding someone and changing a salary always save their rows under one shared id, even outside a web request (the console, a task), so the link holds wherever the change is made.
- **The data is what we have.** Salary history covers everyone, including the seed. Department and title changes exist only for edits made in the app, because the seed bulk-loads employees without audits and the schema keeps only the current department and title (ADR 0003). So a seeded employee's timeline shows joining, salary changes, promotions without the title names, anniversaries and leaving.
- **An audit log panel**, opened from an "Audit log" button on the profile, slides in from the right. It lists every saved change to the employee or one of their salary revisions, newest first: each changed column (including status and the stored salary copy), old → new with names instead of ids, who and when, and the reason (a salary change's reason, or a note if one is ever recorded). Nothing is grouped or hidden; it's the record for checking.
- **`GET /employees/:id/timeline`** serves the timeline and **`GET /employees/:id/audits`** the audit log. The audit log replaces the grouped change history from ADR 0012's update of the same day, which nothing had shipped against yet.
- **Business unit:** the Details card shows "ACME" as the business unit. It's a label in the UI only, because every employee is in ACME and there's no business-unit data yet.

## Options considered
- **Keep the two lists** (salary table and change history). Already built, but HR has to stitch the story together.
- **An effective-dated job history table** (ADR 0003 option C): department and title per period, filled by the seed and every change. Full history for everyone, but a schema change and a seed rewrite for a timeline that's useful without it.
- **A grouped audit view** (one entry per action). Easier to read, but it hides columns, and the timeline already gives the readable story.
- **Business unit as data** (a constant in the API, or a lookup table and column). More honest data, but nothing to choose between today; the product owner preferred the label.

## Consequences
- Good: the profile tells the person's story in one place, and the audit log gives the complete record next to it.
- Good: no schema change. The timeline and the log are built from tables we already have.
- Cost: seeded employees' timelines lack department and title moves, and seeded promotions show no title names. The page says nothing misleading: it only shows what's recorded.
- Cost: anniversaries make long timelines for long-serving people (one per year). Year headings keep it scannable.
- Cost: the business unit isn't in the API. If units arrive, it becomes real data and the label goes.
