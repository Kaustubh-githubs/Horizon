# 0016. API conventions

Status: Accepted · 2026-10-28

## Context
The React app is the only client, but every endpoint should still look and behave the same way, so the UI code stays simple and reviewers can predict any endpoint from one example.

## Decision
- **Versioned paths:** everything lives under `/api/v1`. A breaking change gets `/api/v2` instead of breaking the app.
- **Login by default:** every endpoint requires a signed-in user unless it opts out (ADR 0009).
- **One error shape** for every failure: `{ "errors": { "field": ["message"] } }`. Errors that aren't about a field use `base`. Forms show each message next to its field.
  - Update 2026-10-31 (found in testing): a body that isn't valid JSON is a 400 in this shape ("The request body isn't valid JSON") instead of Rails' own error page, and a login without a password is the usual 401 instead of a 500. A date that doesn't exist (30 February) says "is not a valid date" instead of "can't be blank".
- **Lists** return `{ "data": [...], "meta": { "page", "per_page", "total_count", "total_pages" } }`.
  - Paging uses the **Pagy** gem: `page` and `per_page`, 25 by default and at most 100, whatever the client asks for. A missing, zero, negative or non-numeric `per_page` means 25. A page past the end returns no rows, with the real totals in `meta`, so the client can move back to the last page.
  - Sorting is `sort=column` (ascending) or `sort=-column` (descending), and only from a fixed list of columns, so the parameter can't be used to inject SQL. Anything else gets the default sort (name, ascending). The id breaks ties, so rows never repeat or go missing between pages. Sorting by `employee_code` sorts by id: the code is built from the id (ADR 0014), and text order would go wrong once codes pass six digits.
  - Filters are plain query parameters (`country`, `department_id`, …). Search is `q`. `country` and `status` ignore case; an unknown status means the default (active).
- **Shapes come from small serializer classes** (`EmployeeSerializer`) that list every field explicitly, so nothing is exposed by accident. Related records are returned as names alongside ids (`department: { id, name }`), so the UI never needs a second request to show a label.
- **Money is a string** in JSON (`"2500000.5"`), so JavaScript never turns it into a float (ADR 0006).
- **Query objects** (`app/queries`) build list queries and preload associations, so a page is a fixed number of database queries whatever its size. A spec checks this.

## Options considered
- **Kaminari, or hand-written paging.** Kaminari is heavier and adds methods to every model. Hand-written paging is about 15 lines, but Pagy is small, fast and well known, and saves us owning edge cases like out-of-range pages.
- **JSON:API format, or a serializer gem** (Alba, jsonapi-serializer). Standard and feature-rich, but heavier than this app needs. Plain classes are easy to read and test.
- **Keyset (cursor) paging.** Faster for very deep pages, but it can't jump to "page 40". At 10,000 rows offset paging takes about 1 ms (docs/performance.md). Pagy supports keyset if the data grows.

## Consequences
- Good: the UI has one error handler and one list pattern, and new endpoints follow by example.
- Good: sorting and paging can't be abused (the allowed list, the cap of 100 per page).
- Cost: each serializer is hand-written. That's fine at this size.
- Cost: offset paging slows down on very deep pages of very large tables. Not an issue at this scale, and switchable later.
