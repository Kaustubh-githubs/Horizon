# 0020. Department budgets

Status: Accepted · 2026-10-30

## Context
HR wants to know whether each department's pay fits its budget: is it over, close to the limit, or comfortably under, and how long the money lasts at today's payroll. Departments employ people in several countries and currencies. This is a good-to-have beyond the brief, so it should stay small and easy to explain.

## Decision
- **One budget per department per year** (`department_budgets`), in **INR**, the reporting currency the insights already use (ADR 0019). A unique index allows one budget per department and year. The amount must be above zero and fit the money column. There's no currency column: every budget is in INR by rule, so a column could only ever hold one value. Changing the reporting currency would need a data migration (ADR 0006 otherwise stores the currency next to every amount).
- **HR sets budgets in the app** on a Budgets page, for **this year only** (the UTC year, ADR 0017). Past years' rows stay, so planning next year can be added later without changing the data. Changing a budget sends its `lock_version`, and a conflicting save gets a 409, as for employees (ADR 0017).
- **Payroll** is the yearly pay of the department's active employees at their current salaries, converted to INR with the dated exchange-rate table (a projection, the same one the insights use). Employees paid in a currency with no rate can't be converted. They still count in the headcount, and the page names their currencies. **Headcount** is how many active employees the department has.
- **Status bands**, fixed constants in one place: over budget above 100% of the budget, near the limit from 90% to 100%, under budget below 90%. The band is decided on the % rounded to one decimal, the number the page shows, so a label never contradicts its number. A department with no budget says so instead of getting a status.
- **Runway:** how many months of the year the budget covers at today's monthly payroll, which is 12 × budget ÷ yearly payroll, counted from 1 January. Under 12 means the money runs out in that month; 12 or more covers the year.
- **Combined budget:** the total of all budgets against the payroll of the departments that have one, with the same bands and runway. Departments without a budget are counted separately, not compared with nothing.
- **History:** budgets are the first model on the audit trail (ADR 0012). Each set or change records who made it, when, and the old and new amount, and the page shows it per department.
- **Seed:** this year's budget for every department with staff, set from its payroll with a fixed pattern so the demo shows departments over, near and under budget. They are created through the model, so each one starts with a "set" entry in its history.

## Options considered
- **A budget per department, per country, in local currency.** We built this first. Each cell was exact in its own currency, but the page became an 8 × 8 grid with totals that were often incomplete, and the extra detail didn't answer HR's question any better. Dropped as too complex for its value.
- **This year and next.** Lets HR plan ahead, but needs a year switch and only matters late in the year. Easy to add later, since the year is stored.
- **Seeded, read-only budgets.** Less to build, but HR couldn't actually budget.
- **Our own `budget_changes` table** for history. Clear and queryable, but it's a second history mechanism next to the audit trail we had already chosen.
- **Spending to date** from salary history (pay actually earned since 1 January). More exact for people who joined, left or got raises during the year, but much harder to explain. Today's payroll is a clear, stated projection.

## Consequences
- Good: one number per department, one table, and a combined figure on top. Easy to explain and to test.
- Good: the bands, runway and history are simple enough to show on the page.
- Cost: no view by country, so HR can't see which country pushes a department over. The insights dashboard still breaks pay down by country.
- Cost: a department's % used moves when exchange rates change, even if nobody's pay did. Our rates are a dated table, so this only happens when it's updated.
- Cost: the projection ignores hires, departures and raises later in the year. The page says it uses today's payroll.
- Cost: no way to delete a budget (set a new amount instead).
