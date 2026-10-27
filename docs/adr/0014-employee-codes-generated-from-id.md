# 0014. Employee codes are generated from the row's id

Status: Accepted · 2026-10-28 · Supersedes [0013](0013-employee-codes-from-a-database-sequence.md)

## Context
ADR 0013 generated codes from a custom Postgres sequence. When we built it, Rails' `db/schema.rb` recorded the column default but not the `CREATE SEQUENCE`. The test database is rebuilt from `schema.rb`, so it came up without the sequence and every employee insert failed.

The standard fix is to switch to `db/structure.sql`, a raw SQL dump. We tried it and it worked, but we'd rather keep `schema.rb`: it's Rails' default, it's readable Ruby, its diffs are clean, and it needs no `pg_dump` wherever migrations run.

## Decision
`employees.employee_code` is a **stored generated column** that Postgres computes from the row's `id`:

```sql
'EMP-' || lpad(id::text, GREATEST(6, length(id::text)), '0')
```

- id 123 gives `EMP-000123`, and id 1234567 gives `EMP-1234567`. It pads to six digits but **never truncates** (a plain `lpad(…, 6, '0')` would silently cut 1234567 down to `EMP-123456`).
- It's unique (unique index), and Rails reads it back straight after insert.
- The model marks it `attr_readonly`, so assigning it fails clearly in Ruby.
- `schema.rb` records it as `t.virtual … stored: true`.

## Options considered
- **Keep the sequence and switch to `structure.sql`** (ADR 0013). It works and keeps the option of importing existing codes, but it means giving up `schema.rb` for one column.
- **A counter table** (`UPDATE counters SET value = value + 1 RETURNING value` in a `before_create`). It works with `schema.rb` and keeps import possible, but it's about 20 lines of extra code to own and test for a feature that's out of scope.
- **Work out the next code in Ruby** (`maximum + 1`). A race condition, as noted in 0013.

## Consequences
- Good: no extra code, no custom sequence, and it stays on `schema.rb`. Unique and safe under concurrent saves, because ids come from Postgres.
- Good: the code always matches the id, which makes support and debugging easy.
- Cost: **existing ACME codes can't be kept.** A code is always derived from the id. Importing old codes would mean inserting rows with explicit ids, and then moving the id sequence forward. Import is out of scope (see the requirements), so this is acceptable for now.
- Cost: gaps in ids (a failed insert uses up an id) show up as gaps in codes. That's harmless.
