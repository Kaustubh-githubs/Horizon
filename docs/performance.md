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

**Summary cards** (`GET /employees/summary`): the list's own filters, counted three ways (total, by country, by department). About 1 ms without a search and about 24 ms with one, since each count repeats the `ILIKE` search.

**N+1 guard:** a request spec checks that a page of 10 employees runs the same number of queries as a page of 2. Without preloading country, department and title, that went from 9 queries to 33. The spec fails, as it should.

## Salary changes (ADR 0018)

**Peer pay** (`GET /employees/:id/pay_comparison`): one aggregate query (`COUNT`, `AVG`, `PERCENTILE_CONT`) over active employees with the same country and job title. The largest group in the seed, India × Software Engineer with 846 peers, runs in about 1.4 ms, with a bitmap scan on the existing `(country_id, job_title_id)` index. No new index needed.

**History** (`GET /employees/:id/salary_revisions`): an employee has a handful of revisions (at most 5 in the seed), read in one query on the `(employee_id, effective_from)` index and not paged.

## Insights (ADR 0019)

Every figure is one SQL aggregate over the 9,194 active employees (`GROUP BY` with `COUNT`, `MIN`, `PERCENTILE_CONT`, `AVG`, `MAX`, `SUM`), with no Ruby loops. Median of 5 warm runs on the seeded database:

| Query | Time |
|---|---|
| Overview (headline numbers and ★ count, converted to INR) | 19 ms |
| Segments: country / department / job title / tenure | 14–17 ms |
| Segments: job titles in one country | 2.4 ms |
| ★ outliers, first page of 25 | 7 ms |
| One employee's pay position (profile banner) | 2.7 ms |
| Segments with every filter set (e.g. Engineering in India, 1–3 years, by job title) | 2 ms |
| Pay changes, last 12 months (a `LAG` window over all 30,287 revisions) | 45 ms |

**What we decided:** no caching or summary tables. The slowest call, pay changes, takes about 45 ms because the window has to see every employee's whole history to find each change's previous salary. Everything else is under 20 ms. If the data grows tenfold, the first step would be caching the overview and segments for a few minutes, since pay changes rarely.

## Department budgets (ADR 0020)

**Overview** (`GET /budgets`): three small queries over the 9,193 active employees (headcount per department, payroll in INR per department with a `GROUP BY` and the exchange-rate joins, and this year's 8 budgets), then the % used, status and runway per department in Ruby. About 2 ms on the seeded database (average of 5 warm runs).

**History** (`GET /budgets/:id/audits`): a budget has a handful of audit rows, read in one query on the gem's `(auditable_type, auditable_id, version)` index, with the users in a second query.

## Employee timeline and audit log (ADR 0012, 0021)

**Audit log** (`GET /employees/:id/audits`): one query for the employee's own audit rows and their salary revisions' rows (an `OR` of the gem's `auditable_index` and `associated_index`), one for the users, and one each for the department, job title and country names. About 1 ms for an employee with a handful of changes (average of 20 warm runs).

**Timeline** (`GET /employees/:id/timeline`): the same audit query, the employee's salary revisions (on the `(employee_id, effective_from)` index) and the names; anniversaries are worked out in Ruby. About 1.2 ms for a seeded employee with eight years of anniversaries and five revisions (average of 20 warm runs).

**Writes:** every employee and salary save adds one `INSERT` into `audits`, in the same transaction. The full RSpec suite, which creates thousands of records, went from about 5.4 s to 6.2 s. The seed is unaffected, because bulk inserts skip the audit.
