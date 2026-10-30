# 0017. Editing and terminating employees

Status: Accepted · 2026-10-30

## Context
HR adds, edits and terminates employees from the profile screens. Two things can go wrong. Two people (or two browser tabs) can edit the same employee and silently overwrite each other. And some fields can't change without rewriting salary history, which is append-only (ADR 0004).

## Decision
- **Optimistic locking.** Every edit and termination sends the `lock_version` the form was loaded with. If someone saved in between, the API answers **409 Conflict** and the UI asks the user to reload, rather than overwriting their change. A request without `lock_version` is rejected with 400, so a client can't skip the check by accident.
- **Fixed after creation:** the country (a change would be a transfer, which is out of scope) and the hire date (salary changes and the last working day are checked against it, so moving it could make existing history invalid). The model marks both read-only, so they can't be changed from the console either. The API only accepts name, email, department and job title on edit. Salary changes have their own endpoint (slice 4).
- **Creating an employee** goes through `Employees::Create`. In one transaction it saves the employee and a `hire` salary revision, with the currency taken from the country. The hire date must be today or earlier.
- **The first salary record takes effect today,** the day it's entered, like every salary change (ADR 0005). For a new joiner that's their hire date anyway. For someone added after they started (a late entry, or moving people over from Excel), we only know what they're paid now: dating it back to the hire date would claim they were hired on today's salary, and pay history would be wrong.
- **One clock: UTC.** The database stores timestamps in UTC, and every "today or earlier" rule (hire date, last working day, the date of a salary change) uses the UTC date, for every user. The UI converts for display: a recorded time is shown in the user's local time, and the date pickers offer the UTC date as the latest day.
- **Terminating** is `POST /employees/:id/termination`, a nested resource rather than a `/terminate` verb. The date must be today or earlier, and not before the hire date or the latest salary change.
- **Terminated employees are read-only.** No edits and no salary changes, enforced on both `Employee` and `SalaryRevision`. Rehiring is out of scope (ADR 0008).
- **Wording:** the screens say "End employment", "Last working day" and "Former" employee, which reads as neutral for resignations, retirements and dismissals alike. The API and database keep `terminated` and `terminated_on`, the usual HR data terms, so the rename needed no migration.
- **Errors** use the usual shape (ADR 0016). Errors on an association come back under its id field (`department_id`), so the form can show them next to the right input. If two saves race past the model's email check, the database's unique index stops the second, and it still gets a normal `email` error instead of a 500.

## Options considered
- **Last write wins.** Nothing to build, but one HR person can silently undo another's change.
- **Pessimistic locking** (lock the row while a form is open). Needs lock timeouts and cleanup, and a forgotten tab blocks everyone else.
- **Editable hire date** that also moves the hire revision. Breaks the append-only rule for that row and makes the audit trail harder to read.
- **Future termination dates** for notice periods. The status would have to flip on the day, which needs a scheduled job.
- **First salary record dated on the hire date.** Right for new joiners, but invents history for anyone added later.
- **The user's own time zone,** sent by the browser with each request. Lets everyone pick their local today, but two users can disagree on what today is, so salary changes recorded minutes apart could get dates out of order (see Updates).
- **A fixed company time zone** (`config.time_zone`). Also one clock, but ACME's HR team isn't tied to one zone, and the choice would be a guess. UTC is the neutral one.

## Consequences
- Good: no lost updates, and the fields that anchor salary history can't drift.
- Good: the rules live in the model, so the API, the console and any future import all follow them.
- Cost: a wrongly entered hire date or country means terminating and re-adding the employee. That's acceptable for now, and a "correction" flow can come later.
- Cost: on a 409 the user has to reload and redo their change. At one HR user this should be rare.
- Cost: someone added after they started has salary history only from the day they were added, and their last working day can't be earlier than that.
- Cost: for users ahead of UTC, the latest date they can pick is yesterday's local date for part of the day (in India, until 05:30). Users behind UTC can pick tomorrow's local date in the evening.

## Updates
- **2026-10-30, UTC only:** at first the browser sent its time zone (`X-Time-Zone`) and "today" was the user's today. Reviewing salary changes showed the problem: a change recorded from India could get tomorrow's date, and one recorded minutes later from the US today's, so history went out of order and the latest change was no longer the current salary. Every date rule now uses the UTC date, and the UI converts for display.
