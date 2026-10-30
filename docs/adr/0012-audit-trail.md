# 0012. Audit trail with the `audited` gem (add-on)

Status: Accepted · 2026-10-28

## Context
When pay data changes, someone will eventually ask "who changed this, and when?". Salary history (0004) covers salary amounts, but not edits to employee details or terminations, and it doesn't record who made the change. This is an add-on beyond the core brief, so it should cost as little as possible to build and maintain.

## Decision
Use the [`audited`](https://github.com/collectiveidea/audited) gem for now.
- Its generator creates the `audits` table. We store changes as JSONB (`--audited-changes-column-type jsonb`) so they can be queried in Postgres.
- Models opt in through a small `Auditable` concern that calls the gem with our shared options. Models just `include Auditable`, starting with `Employee` and `SalaryRevision`. If we ever replace the gem, only the concern changes.
  - Update 2026-10-30: department budgets (ADR 0020) are the first model on the trail; `Employee` and `SalaryRevision` follow in the audit-trail add-on. `ApplicationRecord` includes the concern, and a model opts in by calling `auditable`, which passes per-model options (such as `associated_with`) to the gem.
- `SalaryRevision` audits are linked to their employee (`associated_with: :employee`), so the "Change history" tab can show employee and salary changes together.
- "Who" comes from the logged-in user. The gem asks the controller for the current user, which we point at `Current.user` from the login code (0009).
- The gem already skips noise like `updated_at` and `lock_version`.
- The app offers no way to edit or delete audit rows.

## Options considered
- **Our own concern and `audits` table.** About 40 lines and fully under our control, but it's more code to write, test and maintain for an add-on. The gem is mature and already handles the edge cases. We can revisit this behind the same concern.
- **`paper_trail`.** Also mature, but built around restoring old versions of records. We only need a "who changed what" log.
- **Database triggers.** Catch every change, even raw SQL. But passing "who" into the database is awkward, and triggers are harder to test and read.

## Consequences
- Good: a working audit trail with very little code, and adding a model takes one line.
- Good: the gem writes audit rows in model callbacks inside the same transaction as the change, so if the change rolls back, its audit row does too.
- Cost: a new dependency to keep updated, and we follow the gem's table layout.
- Cost: bulk methods (`insert_all`, `update_all`) skip callbacks. The seed script uses them, so seeded data isn't audited (intended, since it's the starting state). Any future bulk edit must write its own audit rows.
- Cost: the table only grows. That's fine at this scale, and it can be archived later.
- Audit rows contain salary values, so they need the same access protection as the salary data itself.
