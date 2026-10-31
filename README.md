# Horizon

A modern salary management system for ACME's HR Manager, designed to replace complex spreadsheets with a clean, reliable single source of truth.

## Current Status
- **Feature-complete in development:** the seed script creates 10,000 employees. The HR Manager can add, edit and terminate employees, change salaries, explore pay insights, set department budgets, and see a timeline and full audit log for every employee.
- **Add-on audit trail working:** every change to an employee, a salary or a budget is recorded (who, what, when) and viewable in the UI.
- **Deploys to Railway** as one service (the React app served by Rails) and a Postgres; see [Deploying](#deploying).
- **Not done yet:** a GitHub CI workflow (the same checks run locally with `bin/ci` and `pnpm test`).

## Quick Start (Development)

**You need:** Ruby 3.4.9, Node 24 (`.nvmrc`), pnpm, and PostgreSQL 14 or later running locally.

```bash
# Backend: installs gems, creates the database, loads the schema, seeds it, and starts Rails on port 3000
cd backend && bin/setup
```

```bash
# Frontend: starts Vite on port 5173 and forwards /api to Rails
cd frontend && pnpm install && pnpm dev
```

Open `http://localhost:5173` and sign in as the demo HR Manager:

- **Email:** `hr@acme.test`
- **Password:** `horizon-demo-2026` (set `DEMO_USER_PASSWORD` before seeding to use your own)

In development the browser only talks to Vite, which forwards `/api` to Rails, so there's no CORS setup (ADR 0001).

**Re-seeding:** `bin/rails db:reset` starts again from scratch. `SEED_EMPLOYEES=500 bin/rails db:seed` seeds a smaller set.

The seed script loads (the same data on every run):
- 10,000 employees across 8 countries: India, the United States, the United Kingdom, Germany, Singapore, the UAE, Brazil and Japan, each paid in its own currency
- 8 departments and 28 job titles, with pay bands by title and country
- 30,287 salary revisions: each employee's starting salary plus raises, promotions and adjustments over the years, with effective dates
- about 8% former employees and about 3% deliberately underpaid people, so the insights have something to find
- exchange rates as of 1 Oct 2026, and the demo HR Manager

It takes about 2.3 seconds, using bulk inserts (ADR 0015, docs/performance.md).

## Design Principles

- **Developer Experience First:** Follows [CONVENTIONS.md](CONVENTIONS.md) for consistent AI-assisted development.
- **One Source of Truth:** All decisions, architecture and rationale are documented in [docs/](docs/).
- **Incremental Development:** Every decision is an ADR (Architecture Decision Record) in [docs/adr/](docs/adr/README.md), 25 so far.

## Core Features

### Employee Management
- **Directory:** Search by name, email or employee code. Filter by country, department, job title and status, sort, and page through 25 at a time. The filters live in the URL, so a link shows the same view. One line above the list counts who matches, and each country and department option shows how many people it would give.
- **Add and Edit:** Validation in the form and on the server, with server errors shown next to their field. If two people edit the same employee, the second save is refused instead of silently overwriting (optimistic locking).
- **Termination:** Employees are terminated with a last working day, never deleted, so history stays intact.
- **Data Quality:** Countries, departments and job titles are picked from lists (searchable for the long ones), never typed, so there are no inconsistent spellings.

### Salary & History
- **Salary Changes:** A raise, promotion, market adjustment or correction takes effect on the day it's recorded (ADR 0005). The dialog shows the % change and what peers in the same role and country earn, and warns about unusually big changes.
- **Real-time Updates:** The employee's current salary updates in the same transaction as the new revision.
- **Salary History:** Every revision is kept, with amount, currency, reason and effective date. History isn't edited; a mistake is fixed with a correction.

### Insights
- **One set of filters for the whole page:** country, department, job title and tenure, in any combination.
- **Headline numbers:** headcount, annual payroll, median salary, and how many people are outliers.
- **Pay by segment:** group by country, department, job title or tenure. Each group shows the lowest, 25th percentile, median, 75th percentile, average and highest pay, plus the payroll, with a chart of the spread. Click a country to see its job titles.
- **Currencies:** one country is shown in its own currency. Across countries, figures are converted to INR (the reporting currency) at dated exchange rates (ADR 0007).
- **Pay changes in the last 12 months:** how many, the average % change, and what they added to yearly pay, by reason.
- **Outliers (★):** people paid 20–50% (you pick) above or below the median for their role in their country.

### Department Budgets
- **One yearly budget per department**, in INR, against today's payroll.
- **Status:** over budget (above 100%), near the limit (90–100%) or under, plus the runway (how far into the year the budget lasts).
- **Combined view:** the combined budget sits on top. Changing a budget is audited, with its history one click away.

### Audit Trail & Timeline
- **Immutable Records:** Every create and update of an employee, salary revision or budget is logged by the `audited` gem in the same transaction. The app has no way to edit or delete an audit.
- **Traceability:** Who changed what and when, with the old and new value of every column.
- **Timeline:** Each employee's profile tells their story by date: joining, salary changes, promotions, department and title moves, work anniversaries, and leaving.
- **Audit Log:** A panel on the profile lists every saved change, column by column.

### Feel of the App
- **Loading and numbers:** an orange loading bar shows whenever something loads, and headline numbers roll in when the app first loads.
- **Navigation:** the filters stay at the top while you scroll, and Back returns you to where you were.
- **Forms:** the app asks before throwing away unsaved changes.
- **Brand Colour:** the loading bar's orange runs through the app: the brand mark, the current page, buttons, the filters that are on, the headline tiles and the charts, at readable contrast in both themes (ADR 0024).
- **Dark Mode:** Light or Dark from the sidebar, starting from the device's theme and remembered per browser. The new theme spreads from the bottom-left corner towards the top right, with no white flash on load (ADR 0023).
- **Loading placeholders:** shaped like the real content, so nothing jumps when data arrives (ADR 0022).

## Technology Stack

### Backend
- **Rails 8.1** (API-only), **Ruby 3.4**
- **PostgreSQL** (14 or later): constraints, indexes, and `percentile_cont` for medians and percentiles
- **Pagy:** pagination
- **Audited gem:** the audit trail
- **Rails' built-in authentication:** session cookies (ADR 0009)
- **RSpec, FactoryBot and shoulda-matchers:** tests
- **RuboCop, Brakeman and bundler-audit:** style and security checks

### Frontend
- **React 19 + TypeScript**, built with **Vite**
- **TanStack Query:** server data, caching and loading states
- **React Router:** routes, URL state, scroll restoration and the unsaved-changes prompt
- **React Hook Form + Zod:** forms and validation
- **shadcn/ui** (Radix) and **Tailwind CSS:** components and styling
- **Recharts:** charts
- **NProgress, NumberFlow and cmdk:** the loading bar, rolling numbers and searchable pickers
- **Vitest + React Testing Library:** unit and component tests, in jsdom

## Architecture

### Backend
- **Thin Controllers:** Business logic lives in service objects (`app/services`) and query objects (`app/queries`).
- **Money Handling:** `decimal(15,2)` in the database and `BigDecimal` in Ruby. The API sends amounts as strings, so JavaScript never turns them into floats (ADR 0006).
- **SQL-based Analytics:** Insights are computed in SQL (aggregates, percentiles, window functions), not in Ruby loops, and checked against hand-built datasets.
- **Constraint Layer:** Database constraints (foreign keys, checks and unique indexes) enforce integrity beyond model validations ([docs/schema.md](docs/schema.md)).

### Frontend
- **Server-Side State:** TanStack Query for fetching, caching and refreshing.
- **URL-Driven State:** Directory and insights filters, sorting and pagination live in the URL, for shareable links and browser history.
- **Type Safety:** Strict TypeScript and type-aware ESLint.
- **Component Library:** Consistent UI through shadcn/ui components.

## Key Differentiators

1. **Data Integrity**
   - Database constraints back up every model validation, so even bulk inserts can't store bad rows (ADR 0002, 0015)
   - Employees are terminated, never deleted, and salary history is never edited (ADR 0004, 0008)
   - ISO currency codes on every amount, and money never touches a float (ADR 0006)

2. **Responsiveness**
   - Filters update instantly, with the previous results shown dimmed until the new ones arrive
   - A salary change updates the profile, the directory and the insights without a page reload
   - Profiles are loaded in advance when you rest the pointer on a directory row

3. **Built for Scale**
   - 10,000 employees seeded in seconds; the directory query checked with `EXPLAIN ANALYZE`, and every insights query timed at under 50 ms ([docs/performance.md](docs/performance.md))
   - Users belong to a persona, so roles and permissions can grow without a schema change (ADR 0010)

4. **Auditability by Design**
   - A complete, immutable change history for employees, salaries and budgets (ADR 0012, 0021)
   - Every product and technical decision recorded as an ADR, with the options that were considered

## Running the Checks

```bash
# Backend: RuboCop, bundler-audit, Brakeman and RSpec
cd backend && bin/ci
```

```bash
# Frontend: types, lint, tests and a production build
cd frontend && pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## Deploying

Horizon deploys to [Railway](https://railway.com) as one service built from the root `Dockerfile` (the React app is built and served by Rails, with the API, on one origin), plus a Railway Postgres (ADR 0025). `railway.toml` holds the build and health-check settings.

1. In Railway, create a project from this GitHub repository (it builds the root `Dockerfile`).
2. Add a **PostgreSQL** database to the project.
3. On the Horizon service, set these variables:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (a reference to the database's own variable)
   - `RAILS_MASTER_KEY` = the contents of `backend/config/master.key`
   - `SEED_ON_BOOT` = `true`, to load the demo data on the first boot
   - `DEMO_USER_PASSWORD` (optional) to use a different demo password than the README's
4. Under the service's **Networking**, generate a domain, then open it and sign in as the demo HR Manager.

Each push to master deploys again. Every boot runs the migrations; the seed skips employees once they exist.

## What's Next

- [ ] **CI on GitHub:** run `bin/ci` and the frontend checks on every pull request.
- [ ] **More Frontend Tests:** the first suite covers formatting, the API client, signing out on a 401, URL filters and the unsaved-changes guard; the forms and dialogs are next.
- [ ] **Mobile Responsive Design:** Below tablet width the sidebar should become a top bar with a menu.
- [ ] **Performance:** Review query performance for 50k+ employees, and load more pages on demand to shrink the main bundle.
- [ ] **Advanced Analytics:** Trends over time, compa-ratios, and CSV export.

More UI ideas are tracked in [docs/ui-todo.md](docs/ui-todo.md).

## Documentation

- [Requirements](docs/requirements.md): What we're building and what we're leaving out.
- [Architecture Decision Records](docs/adr/README.md): Why each decision was made, and what else was considered.
- [Schema](docs/schema.md): Tables, constraints and indexes.
- [Performance Notes](docs/performance.md): Seeding, query plans and optimisation.
- [Conventions](CONVENTIONS.md): Guidelines for anyone (or any AI tool) working in this repo.
- [UI to-do](docs/ui-todo.md): UI and UX polish, done and open.

## License

Internal tooling for ACME only. Unauthorized distribution is strictly prohibited.
