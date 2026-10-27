# 0002. PostgreSQL as the database

Status: Accepted · 2026-10-28

## Context
Half of the product is analytics: medians, averages and totals grouped by country and job title. The data is small (10,000 employees), but the queries should be simple and correct.

## Decision
Use PostgreSQL.

## Options considered
- **SQLite.** The brief mentions it, there is nothing to run, and Rails 8 makes it production-ready. But it has no built-in median, so we'd write window-function workarounds or compute medians in Ruby. It also allows only one writer at a time.
- **MySQL.** Familiar and fine for CRUD, but it also lacks a median function, and has weaker support for check constraints and JSON querying than Postgres.

## Consequences
- Good: `percentile_cont(0.5)` gives the median directly in SQL, so insights stay as a single query.
- Good: real database-level rules: foreign keys, check constraints (such as salary > 0), case-insensitive unique emails, and JSONB for the audit trail.
- Good: it's what most production Rails teams run, so the setup is realistic.
- Cost: Postgres has to run in development, in CI (a service container) and in production.
