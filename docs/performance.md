# Performance notes

Measured numbers, not guesses. Each section says what was measured, how, and what we decided because of it.

Machine: Apple Silicon laptop, PostgreSQL 14 running locally, Ruby 3.4, Rails 8.1.

## Seeding 10,000 employees (ADR 0015)

| Approach | Rows | Time |
|---|---|---|
| **`insert_all` in batches of 1,000** (what we use) | 10,000 employees + 30,287 salary revisions | **2.3 s** (2.75 s including Rails boot) |
| `create!` one row at a time | 500 employees + 1,466 revisions | 1.76 s, which works out to **about 35 s for 10,000** |
| Generating the rows in memory only (no database) | 10,000 employees + 30,287 revisions | under 1 s |

**What we decided:** bulk inserts, about 15× faster. Row-by-row `create!` makes one database round trip per row, about 40,000 in total. That's 35 s on a local database, and far slower against a database across a network, where every round trip also pays latency.

**What it costs, and how we cover it:** `insert_all` skips model validations and callbacks.
- The database constraints (docs/schema.md) still reject bad rows.
- `spec/lib/seeds/runner_spec.rb` checks that seeded rows also pass every model validation.
- `normalizes` still applies inside `insert_all`, because it works at the attribute-type level.

**How to reproduce:** `bin/rails db:reset` then `bin/rails db:seed` prints the timing. The `create!` comparison ran 500 employees inside a transaction that was rolled back afterwards.

**What the seed produces** (seed 42): 10,000 employees, 30,287 revisions, 285 planted underpaid (2.9%), 806 terminated (8.1%). India has 3,959 employees (40%).

## Employee directory queries (ADR 0016)

`EXPLAIN ANALYZE` on the seeded database (10,000 employees, 9,194 active), one page of 25:

| Query | Time | Plan |
|---|---|---|
| Default page: active, sorted by name | 1.0 ms | Sequential scan + top-N heapsort |
| Total count for paging | 0.4 ms | Index-only scan on `status` |
| Search `q=nair` (name, email or code contains) | 3.2 ms | Sequential scan |
| India, highest salary first | 2.5 ms | Country id from a subquery, then bitmap scan via `(country_id, job_title_id)` + top-N heapsort |

**What we decided:** no extra indexes for now. Even the search, a sequential scan over every row with `ILIKE '%term%'`, takes about 3 ms. A trigram index (`pg_trgm`) would only pay off at roughly 10× the data, and every index slows inserts and takes space. We'll revisit at that point.

**Country filter:** we filter with `country_id IN (SELECT id FROM countries WHERE code = ...)` rather than joining `countries`. A join made Rails switch the preloads to one wide `LEFT JOIN` across four tables and count with `COUNT(DISTINCT)`. The subquery keeps the small separate preload queries and a plain count, at the same speed.

**N+1 guard:** a request spec checks that a page of 10 employees runs the same number of queries as a page of 2. Without preloading country, department and title, that went from 9 queries to 33. The spec fails, as it should.
