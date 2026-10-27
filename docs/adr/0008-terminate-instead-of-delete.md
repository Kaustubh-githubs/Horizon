# 0008. Terminate employees instead of deleting them

Status: Accepted · 2026-10-28

## Context
People leave the company, but HR records usually have to be kept for legal and reporting reasons. Deleting a row would also delete its salary history and audit trail.

## Decision
Employees have a `status` (`active` or `terminated`) and a `terminated_on` date. "Removing" someone means terminating them. There is no delete action in the API or UI.

- The directory shows active employees by default, with a filter to see terminated ones.
- Insights count active employees only.

## Options considered
- **Hard delete.** Loses history and breaks the audit trail.
- **A soft-delete gem** (`paranoia`, `discard`). These hide "deleted" rows behind a default scope, which can surprise people (queries quietly skip rows). Also, "terminated" is a real business state with a date, not a technical deletion, so it deserves its own column.

## Consequences
- Good: no data is lost, and terminated employees still show up in history and audits.
- Cost: queries must think about status. Scopes like `Employee.active` keep this in one place.
- Not covered: rehiring someone (it would need a new employment record, see the "full employment history" option in 0003).
