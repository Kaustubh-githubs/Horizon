# Horizon

A modern salary management system for ACME's HR Manager, designed to replace complex spreadsheets with a clean, reliable single source of truth.

## Current Status
- **v1 is running in development:** seed script creates 10k employees, HR Manager can add, edit and terminate employees, view salary history, run insights and see an audit trail.
- **Add-on audit trail working:** every change to an employee or salary is recorded and viewable in the UI.

## Quick Start (Development)

See [docs/setup.md](docs/setup.md) for detailed setup instructions.

```bash
# Start the backend
cd backend && bundle exec rails server

# Start the frontend
cd frontend && npm run dev
```

Access the app at `http://localhost:3000` (frontend) and `http://localhost:3001` (API).

The seed script loads:
- 10,000 employees across 5 countries
- ~5,000 job titles, some with inconsistent spellings
- Multiple salary histories per employee with effective dates
- Real-world department and title distributions

## Design Principles

- **Developer Experience First:** Follows [CONVENTIONS.md](CONVENTIONS.md) for consistent AI-assisted development.
- **One Source of Truth:** All decisions, architecture and rationale are documented in [docs/](docs/).
- **Incremental Development:** Follows ADRs (Architecture Decision Records) in [docs/adr/](docs/adr/README.md).

## Core Features

### Employee Management
- **Directory:** Search, filter (country, department, title, status), sort, and paginate with 50k+ records.
- **CRUD Operations:** Add, edit, and view employees with real-time validation.
- **Termination:** Soft delete with termination date retention for historical accuracy.
- **Data Quality:** Dropdowns for reference data (country, department, title) prevent inconsistent data.

### Salary & History
- **Effective Dating:** Salary changes take effect on specified dates (past or present).
- **Real-time Updates:** `current_salary` updates automatically when a new revision is created.
- **Salary History:** Complete revision history with amount, currency, and reason.

### Insights
- **Per-country & Per-title Analysis:** Headcount, min/median/average/max salary, and total payroll in local currency.
- **Global USD View:** Aggregated USD total using a fixed exchange-rate table.
- **Pay Equity:** Highlights employees paid significantly below their role's median.
- **Cross-functional Visibility:** Department-level insights without revealing individual salaries.

### Audit Trail
- **Immutable Records:** Every change (employee update or salary revision) is logged and cannot be edited.
- **Traceability:** Track who changed what, when, and the old/new values.
- **Accessibility:** Viewable in a dedicated "Change history" tab on employee profiles.
- **Foundation for Compliance:** Supports audit, governance, and reporting requirements.

## Technology Stack

### Backend
- **Rails 8.1** - API-only application
- **Ruby 3.4**
- **PostgreSQL 16** - Production-ready database with constraints and indexing
- **Shadcn/ui** - UI components with Tailwind CSS
- **RSpec + FactoryBot** - Comprehensive testing
- **Audited gem** - Standardized audit trail implementation
- **Percentile_cont** - Advanced analytics in SQL

### Frontend
- **React 19 + TypeScript** - Type-safe and modern UI
- **Vite** - Fast build tool
- **TanStack Query** - Data fetching and state management
- **Tailwind CSS** - Utility-first styling
- **Vitest + React Testing Library** - Unit testing
- **MSW (Mock Service Worker)** - API request mocking

## Architecture

### Backend
- **Thin Controllers:** Business logic resides in service objects (`app/services`) and query objects (`app/queries`).
- **Money Handling:** `BigDecimal` with `decimal(15,2)` precision for financial calculations.
- **Query Optimization:** N+1 query protection and SQL-based analytics (no in-memory aggregation).
- **Constraint Layer:** Database constraints enforce data integrity beyond model validations.

### Frontend
- **Server-Side State:** TanStack Query for robust data fetching and caching.
- **URL-Driven State:** Directory filters, sorting, and pagination are URL-encoded for shareable links and browser history.
- **Type Safety:** Strict TypeScript with minimal `any` usage and explanatory comments when necessary.
- **Component Library:** Consistent UI through shadcn/ui components.

## Key Differentiators

1. **Unmatched Data Integrity**
   - Database constraints ensure consistency that models alone cannot guarantee
   - Hard deletes are prevented, preserving historical accuracy
   - ISO currency codes and strict formatting avoid ambiguity

2. **Real-time Responsiveness**
   - Directory filters update instantly via client-side routing
   - One-line salary updates propagate immediately to all views
   - No page reloads for common operations

3. **Scalability Built-in**
   - Designed for 10k+ employees with optimized queries
   - Row-level security model ready for future regional isolation
   - Stateless architecture supports horizontal scaling

4. **Auditability by Design**
   - Complete change history with immutable records
   - AI-assisted documentation of decisions
   - Clear separation of concerns for compliance requirements

## What's Next

- [ ] **Performance Optimization:** Review and enhance query performance for 50k+ employee scenarios.
- [ ] **Dark Mode:** Implement comprehensive dark mode support across the application.
- [ ] **Mobile Responsive Design:** Optimize layouts and interactions for mobile devices.
- [ ] **Advanced Analytics:** Expand insights with trend analysis and predictive analytics.

## Documentation

- [Requirements](docs/requirements.md): What we're building and what we're leaving out.
- [Architecture Decision Records](docs/adr/README.md): Why architectural decisions were made.
- [Setup Guide](docs/setup.md): How to get the project running locally.
- [Conventions](CONVENTIONS.md): Guidelines for anyone (or any AI tool) working in this repo.
- [Performance Notes](docs/performance.md): Insights and optimization strategies.

## License

Internal tooling for ACME only. Unauthorized distribution is strictly prohibited.
