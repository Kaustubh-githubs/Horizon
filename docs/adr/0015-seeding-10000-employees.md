# 0015. Seeding 10,000 employees

Status: Accepted · 2026-10-28

## Context
The brief asks for a seed script with 10,000 employees. The seeded data is also what reviewers see in the demo, so it has to be:
- **realistic enough to make the insights meaningful,** with real differences between countries, titles and departments, and some people paid below their peers;
- **fast,** taking seconds, not minutes;
- **repeatable,** with the same data on every run, so the demo, the screenshots and the specs agree;
- **safe to run again,** including against the deployed demo.

## Decision
**Structure: a pure generator plus a separate writer.**
- `lib/seeds/reference_data.rb`: countries (with currency, headcount weight and cost-of-living factor), fixed exchange rates labelled illustrative, departments, and job titles (each with a department and a base pay band in USD). Plain constants.
- `lib/seeds/employee_generator.rb`: pure Ruby with no database access. Given `Random.new(seed)` and a `today` date, it returns employee rows and salary-revision rows as plain hashes.
- `lib/seeds/runner.rb`: writes to the database. It upserts reference data, then bulk-inserts employees and revisions with `insert_all` in batches of 1,000, using `returning: :id` to link revisions to their employees.
- `db/seeds.rb` just calls the runner.

**The data:**
- 8 countries with weighted headcount (India largest), each with its real currency.
- Salary = the title's USD band × the country's cost factor, converted to local currency, with ±15% spread.
- About 3% of employees are deliberately paid 25–40% below their band, so the "paid below peers" insight has something to show.
- Each employee gets a `hire` revision on their hire date, plus 0–4 later changes (`annual_raise`, `promotion`, `market_adjustment`), all in the past. `current_salary` is the latest revision. That's about 30,000 revisions in total.
- About 8% of employees are terminated, after their last salary change.

**Repeatable and safe:**
- A fixed random seed, for both our `Random` and Faker, plus `today` passed in, gives the same data on every run.
- Running it again is safe: reference data is upserted, and employees are only seeded when the table is empty. Otherwise it prints "already seeded" and stops. `bin/rails db:reset` gives a clean slate in development.

**Names:** the Faker gem, in the **default** Gemfile group, because the deployed demo is seeded in production.

## Options considered
- **`create!` in a loop.** Validations and callbacks run for every row, but that's about 40,000 round trips: roughly a minute rather than seconds. The database constraints (docs/schema.md) and a spec that checks a sample against model validations give us the same safety with bulk inserts.
- **The `activerecord-import` gem.** Rails' built-in `insert_all` does the same job without a dependency.
- **Generate a CSV and load it with Postgres `COPY`.** The fastest option, but it needs extra tooling and a temporary file, which is far more than 10,000 rows need.
- **Faker in development and test only.** We couldn't seed the deployed demo.
- **Our own name lists.** No dependency, but less variety and more data to maintain.
- **Wipe and reseed on every run.** Simple, but one accidental run against the demo would destroy it.

## Consequences
- Good: the generator is tested in isolation, quickly and deterministically, with no database. The runner is tested with 50 employees, so the suite stays fast.
- Good: a full seed takes seconds, and the numbers are recorded in `docs/performance.md`.
- Cost: `insert_all` skips model validations and callbacks. The database constraints catch bad rows, and a spec checks that seeded rows also pass model validations. Seeded data isn't audited, which is intended, since it's the starting state (ADR 0012).
- Cost: Faker is a production dependency used only for seeding. It's small and well maintained, and it's only loaded when the seed runs.
- Cost: changes to the generator change the seeded data, so screenshots and examples in the docs may need refreshing.
