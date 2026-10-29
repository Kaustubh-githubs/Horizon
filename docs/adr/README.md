# Decision records

Short notes on the decisions that shape Horizon: what we chose, what else we considered, and what it costs us. Each one is written when the decision is made, so the reasoning is captured while it's fresh.

| # | Decision | Status |
|---|---|---|
| [0001](0001-rails-api-and-react-app-in-one-repo.md) | Rails API and React app in one repo | Accepted |
| [0002](0002-postgresql.md) | PostgreSQL as the database | Accepted |
| [0003](0003-data-model-with-lookup-tables.md) | Data model with lookup tables | Accepted |
| [0004](0004-salary-history-with-current-salary.md) | Salary history, with the current salary kept on the employee | Accepted |
| [0005](0005-salary-changes-take-effect-on-the-day-recorded.md) | Salary changes take effect on the day they're recorded | Accepted |
| [0006](0006-storing-money.md) | How money is stored | Accepted |
| [0007](0007-comparing-pay-across-currencies.md) | Comparing pay across currencies | Accepted |
| [0008](0008-terminate-instead-of-delete.md) | Terminate employees instead of deleting them | Accepted |
| [0009](0009-login-with-session-cookies.md) | Login with Rails' built-in session cookies | Accepted |
| [0010](0010-users-and-personas.md) | Users belong to a persona | Accepted |
| [0011](0011-frontend-stack.md) | Frontend stack | Accepted |
| [0012](0012-audit-trail.md) | Audit trail with the `audited` gem (add-on) | Accepted |
| [0013](0013-employee-codes-from-a-database-sequence.md) | Employee codes come from a database sequence | Superseded by 0014 |
| [0014](0014-employee-codes-generated-from-id.md) | Employee codes are generated from the row's id | Accepted |
| [0015](0015-seeding-10000-employees.md) | Seeding 10,000 employees | Accepted |
| [0016](0016-api-conventions.md) | API conventions | Accepted |

Each note has the same parts: **Context** (why we had to decide), **Decision**, **Options considered** and **Consequences** (good and bad).
