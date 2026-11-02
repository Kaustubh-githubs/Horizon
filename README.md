# Horizon

A modern salary management system for ACME's HR Manager, designed to replace complex spreadsheets with a clean, reliable single source of truth.

**Live demo: [horizon-0owa.onrender.com](https://horizon-0owa.onrender.com)**

- **Sign in:** as the demo HR Manager, `hr@acme.test`, with the password under [Quick Start](#quick-start-development).
- **First load:** it runs on Render's free plan, which sleeps after 15 minutes without visitors, so the first page can take about a minute to wake.

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

## Running the Checks

```bash
# Backend: RuboCop, bundler-audit, Brakeman and RSpec
cd backend && bin/ci
```

```bash
# Frontend: types, lint, tests and a production build
cd frontend && pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## Documentation

- [Requirements](docs/requirements.md): What we're building and what we're leaving out.
- [Architecture Decision Records](docs/adr/README.md): Why each decision was made, and what else was considered.
- [Schema](docs/schema.md): Tables, constraints and indexes.
- [Performance Notes](docs/performance.md): Seeding, query plans and optimisation.
- [Conventions](CONVENTIONS.md): Guidelines for anyone (or any AI tool) working in this repo.
- [How AI was used](docs/ai-usage.md): What the AI did, what the developer decided, how its work was checked, and where it was wrong.