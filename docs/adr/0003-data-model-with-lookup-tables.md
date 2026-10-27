# 0003. Data model with lookup tables

Status: Accepted · 2026-10-28

## Context
The main problem with the spreadsheets is inconsistent data. The same job title is typed in different ways, which quietly breaks any "pay by role" comparison. The data model should make that impossible.

## Decision
Country, department and job title live in their own tables, and employees point to them by foreign key.

```
countries(code, name, currency_code)        exchange_rates(currency_code, rate_to_usd, as_of)
departments(name)                           job_titles(name)
employees(employee_code, full_name, email, hire_date, status, terminated_on,
          country_id, department_id, job_title_id,
          current_salary, current_currency, lock_version)
salary_revisions(employee_id, amount, currency, effective_from, reason)
```

Seniority is part of the title (for example "Senior Software Engineer") rather than a separate level column. That keeps "pay by title" a single grouping.

## Options considered
- **A. Plain text columns.** Fewest tables and no joins. But values drift ("Sr. Engineer" vs "Senior Engineer"), a rename touches thousands of rows, and only app code protects the data.
- **C. Full employment history.** Promotions and country moves are kept as dated records. This is the most realistic option, but every "current" query must find the latest record per employee, and writes get overlapping-date rules. Too much for this brief, so it goes on the "what's next" list.

## Consequences
- Good: insights group by IDs, so the numbers are reliable, and the database rejects invalid values.
- Good: filter dropdowns read straight from the tables, and a rename happens in one place.
- Cost: lists need joins, so related records must be loaded up front to avoid one query per row (N+1).
- Cost: lookup data is seeded. There are no screens to manage titles or departments in this version.
