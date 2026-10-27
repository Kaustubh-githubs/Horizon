# Horizon conventions

Rules for anyone working in this repo, whether a person or an AI tool (Claude Code, Cursor, Copilot, Codex, Aider and others).

Horizon is a salary management app for ACME's HR Manager: about 10,000 employees across several countries. Read these first:
- [docs/requirements.md](docs/requirements.md): what we're building and what we're leaving out.
- [docs/adr/](docs/adr/README.md): the decisions already made and why. Don't quietly work against them. If one seems wrong, say so.

## How we work
- **Discuss before building.** For anything beyond a small fix, lay out 2–3 options with pros and cons and let the developer choose.
- **Small steps.** Make one focused change, then stop and suggest a commit message. The developer reviews and commits. AI tools don't commit, push or open PRs unless asked.
- **One branch and PR per phase** (`docs/...`, `feat/...`), merged into `master` without squashing.
- **Test first.** Write a failing test, make it pass, then tidy up. The commit history should show this.
- **Ask, don't assume.** If the requirements don't cover something, ask, or write the assumption down.
- **No new dependencies** (gems or npm packages) without asking first.
- **Commit messages** follow Conventional Commits: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`.

## Layout
```
backend/    Rails 8.1 API-only app (Ruby 3.4, PostgreSQL)
frontend/   React + TypeScript (Vite, shadcn/ui, Tailwind)
docs/       requirements, ADRs, performance notes
```
Setup and test commands will be added here once the project skeleton exists.

## Backend
- **Controllers stay thin.** Business logic goes in service objects (`app/services`), and reporting queries go in query objects (`app/queries`).
- **Money:** `decimal(15,2)` and `BigDecimal`, always stored with an ISO currency code. Never use floats (ADR 0006). JSON returns amounts as strings.
- **Salary writes only go through `SalaryRevisions::Create`.** It saves the revision and updates `employees.current_salary` in one transaction. The effective date is always today (ADR 0004, 0005).
- **Employees are terminated, never deleted** (ADR 0008). No `default_scope`. Use explicit scopes like `Employee.active`.
- **Reference data** (countries, departments, job titles) lives in lookup tables with foreign keys (ADR 0003).
- **Constraints at both levels:** model validations plus database constraints (NOT NULL, foreign keys, unique indexes, check constraints).
- **Insights are computed in SQL** (grouping, `percentile_cont`). Don't load rows into Ruby to aggregate them.
- **Avoid N+1 queries.** Preload associations in lists.
- **API:** routes under `/api/v1`, JSON only, errors shaped as `{ "errors": { "field": ["message"] } }`.
- **Auditing:** models opt in with `include Auditable` (wraps the `audited` gem, ADR 0012).
- **Style:** RuboCop (`rubocop-rails-omakase`) must pass.

## Frontend
- **TypeScript strict mode.** No `any` without a comment explaining why.
- **Server data goes through TanStack Query.** Don't copy API data into local state.
- **Directory filters, sorting and paging live in the URL.**
- **Use shadcn/ui components** before writing custom ones.
- **Format money with `Intl.NumberFormat` and its currency.** Never show an amount without its currency.
- **Every data view handles** loading, empty and error states.
- **Style:** ESLint and `tsc --noEmit` must pass.

## Tests
- **Backend:** RSpec + FactoryBot. Frontend: no automated tests for now (deferred). Strict TypeScript and type-aware ESLint are the safety net until we add Vitest + React Testing Library.
- **Fast and deterministic:** no real network, fixed random seeds, and frozen time (`travel_to`) wherever dates matter.
- **Insights tests use small hand-built datasets,** so the expected numbers can be checked by hand.
- **Test behaviour, not implementation.** One reason to fail per test, with a name that reads like a sentence.
- **Never delete or weaken a failing test to make it pass.** Fix the code, or ask.
