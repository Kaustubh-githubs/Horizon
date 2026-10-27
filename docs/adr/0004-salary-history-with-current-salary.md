# 0004. Salary history, with the current salary kept on the employee

Status: Accepted · 2026-10-28

## Context
In Excel a raise overwrites the old number, so pay history is lost. We want to keep every change. But most screens (the directory, sorting by salary, insights) only need the *current* salary, and they should stay simple and fast.

## Decision
- Every salary change is a row in `salary_revisions` (amount, currency, effective date, reason).
- The employee row also keeps a copy: `current_salary` and `current_currency`.
- All salary writes go through one service, `SalaryRevisions::Create`. In a single transaction it saves the revision and updates the copy on the employee. Changes take effect on the day they're recorded (0005), so a new revision is always the latest one.
- Creating an employee creates their first revision in the same way.

## Options considered
- **One salary column on the employee.** Simplest, but it repeats the Excel problem of losing history.
- **History only, current salary worked out at read time** (latest revision per employee, via a query or database view). One source of truth and no syncing. But every list, sort and insight query gets a "latest row per employee" subquery. At 10,000 rows this would still be fast, so this is about simplicity, not speed.

## Consequences
- Good: lists and insights read one indexed column on `employees`.
- Good: full history with a reason for every change.
- Cost: the same fact is stored in two places. If anything changes the salary without going through the service, they drift apart. Tests check that both are always updated together.
