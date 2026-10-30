# 0006. How money is stored

Status: Accepted · 2026-10-28

## Context
Salaries must be exact. Floating-point numbers can't represent many decimal values exactly (0.1 + 0.2 ≠ 0.3), and small rounding errors add up in totals across thousands of employees. Salaries are also in different currencies, which don't all use the same number of decimal places.

"Salary" here means annual gross base pay, in the employee's local currency.

## Decision
- Amounts are stored as `decimal(15, 2)` and handled as `BigDecimal` in Ruby.
- The ISO currency code (INR, USD, GBP…) is always stored next to the amount, on both the revision and the employee.
- The API sends amounts as strings, so JavaScript doesn't turn them into floats. The UI formats them for display with `Intl.NumberFormat`, using the currency.

## Options considered
- **Float.** Rejected because of rounding errors.
- **Integer minor units** (cents, paise). Exact and common in payment systems. But each currency needs its own number of decimals (JPY has none), which adds conversion code everywhere for little gain at this scale.
- **The `money-rails` gem.** Handles all of this, but it's an extra dependency for something a decimal column covers. We could revisit it if currency maths grows.

## Consequences
- Good: exact sums and averages in SQL, and simple, readable columns.
- Good: storing the currency on each revision means history stays correct even if an employee's currency ever changes.
- Cost: amounts arrive in the UI as strings, so the UI must parse them before any arithmetic (for example, the % change preview).

## Updates
- **2026-10-30, upper limit:** `decimal(15,2)` holds amounts below 10^13. The models now reject anything larger as "is too large", so an extra-long number is a normal field error instead of a database overflow (which came back as a 500). The add form checks the same limit.
