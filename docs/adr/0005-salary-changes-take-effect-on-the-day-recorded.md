# 0005. Salary changes take effect on the day they're recorded

Status: Accepted · 2026-10-28

## Context
The current salary is copied onto the employee (0004). Two kinds of dates make that copy hard to keep right:
- **Future-dated raises.** The copy is wrong until the date arrives, unless something updates it on that day.
- **Back-dated raises.** For example, a raise approved in June but effective from 1 April. The history arrives out of order, we'd need logic to decide which revision is "current", and the employee is owed back pay for April to June.

In practice, when a raise is approved late, companies apply the new salary going forward and pay the difference as **arrears** through payroll.

## Decision
A salary change takes effect on the day HR records it. The effective date is set to today automatically, not typed in.

If a raise was approved late, the back pay is handled as arrears in payroll, outside Horizon. The reason field can note it, for example "Annual raise. Arrears from 1 April paid via payroll."

Seeded history (past raises) has past dates. The rule applies to changes recorded through the app.

## Options considered
- **Allow future dates and run a daily job** that applies them when their date arrives. It adds a scheduler, a job and a failure case (if the job doesn't run, salaries are wrong) for a feature nobody asked for.
- **Allow back-dating.** History can arrive out of order, the "is this the latest?" logic gets tricky, and it pulls arrears calculations into the app. Those belong to payroll, which is out of scope.
- **Work out the current salary at read time** instead of storing a copy (see 0004). Handles any date naturally, but makes every list and insight query more complex.

## Consequences
- Good: the simplest possible rule. Every new change is the latest one, so the stored current salary is always right, with no background work.
- Good: history is recorded in the order things actually happened.
- Cost: HR can't schedule raises ahead of time or record them retroactively. Arrears are tracked in payroll, not here.
- If that's needed later, we add an effective-date field and arrears handling in a new ADR that replaces this one.
