# 0013. Employee codes come from a database sequence

Status: Accepted · 2026-10-28

## Context
Every employee needs a short, unique code that HR uses day to day, for example `EMP-000123`. ACME already has codes in its spreadsheets. New employees added in Horizon need a code too, and HR shouldn't have to invent one.

## Decision
- `employees.employee_code` is required and unique (unique index).
- For new employees, the database generates it. The column's default is `'EMP-' || lpad(nextval('employee_code_seq')::text, 6, '0')`, which gives `EMP-000001`, `EMP-000002` and so on.
- Rails 7.1+ reads the generated value back from the insert, so the saved record has its code straight away, with no reload or second query.
- Existing codes (from the seed or a future import) are inserted as given. Afterwards the sequence is moved past the highest existing number, so new codes never clash.
- HR can't edit a code once it's assigned.

## Options considered
- **Work out the next code in Ruby** (`maximum + 1`). Two HR users saving at the same moment can get the same number, and one save fails on the unique index. A classic race condition.
- **Build the code from the row's `id` after saving.** Needs a second write for every new employee, and any gaps in IDs show up in the codes.
- **HR types the code by hand.** No database tricks, but it invites typos and duplicates, which is the spreadsheet problem we're replacing.

## Consequences
- Good: unique even when several saves happen at once. Postgres hands out each sequence number exactly once.
- Good: one insert, and the code is available immediately.
- Cost: the sequence must be moved forward after any bulk insert with explicit codes (seed or import). The seed script does this, and a spec checks it.
- Cost: numbers can have gaps (a failed insert still uses up a number). That's normal for sequences and harmless for codes.
