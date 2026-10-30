# 0019. Insights dashboard

Status: Accepted · 2026-10-30

## Context
The brief's second job is answering "how does the org pay people?". HR wants pay broken down by country, department, job title and tenure, and wants to see who is paid far from their peers. Pay is in several currencies (ADR 0007), so every figure has to be clear about which currency it's in.

## Decision
- **Segments:** country, department, job title and tenure band (under 1 year, 1–3, 3–5, 5–10, 10+ years, from the hire date). For each one: headcount, lowest, median, average and highest pay, and total payroll. Active employees only (ADR 0008).
- **Currency:**
  - Figures for **one country** (the country view, or any segment filtered to a country) are in that country's own currency, exactly.
  - Figures **across countries** (departments, tenure, job titles or the whole org) are converted to **INR**, the reporting currency, using the fixed exchange-rate table. They're labelled as converted, with the rates' date.
  - INR is a single constant (`Insights::REPORTING_CURRENCY`), so switching to another currency is a one-line change.
  - Employees in a currency that has no exchange rate are left out of converted figures, and the response names the missing currencies, rather than silently dropping them.
- **Outliers, shown with a ★:** active employees paid more than **40% below or above the median** of their peers, meaning active employees with the same job title in the same country. Only groups of at least 5 count; smaller groups are too small to judge. HR can change the threshold on the page (20–50%). The list is sorted by how far from the median each person is.
- **Where stars appear:** a list on the dashboard (filter by country and by below or above, click through to the profile), and a banner on the employee's profile.
- **All maths in SQL** (`PERCENTILE_CONT`, `AVG`, `GROUP BY`), in query objects under `app/queries/insights`, so a 10,000-row company is a handful of fast queries and Ruby never loops over employees.
- **Endpoints:** `GET /insights/overview`, `GET /insights/segments?by=…&country=…`, `GET /insights/outliers?…` (paged) and `GET /employees/:id/pay_position` (for the profile banner).

## Options considered
- **USD as the reporting currency** (what ADR 0007 first said). Neutral, but HR thinks in rupees, and India is the largest country (40% of staff).
- **A statistical outlier rule** (1.5× the interquartile range). Adapts to each role's spread and flags about 200 people in the seed, but "outside 1.5 IQR" is hard to explain to HR. "45% below peers" isn't.
- **±30% from the median.** About 1,000 people (11%), too long to act on.
- **Comparing with the median excluding the employee** (as the change-salary dialog does). Fairer for tiny groups, but it needs a median per person. With groups of 5 or more, including them barely moves the median.
- **Pre-computed summary tables** refreshed by a job. Faster at large scale, but adds a job and staleness for queries that take a few milliseconds at 10,000 rows.

## Consequences
- Good: every number says which currency it's in, and single-country numbers are exact.
- Good: the threshold and the minimum group size are constants in one place, and HR can tune the threshold without a deploy.
- Cost: converted figures move when the rate table is updated, not when pay changes. The rates' date is shown next to them.
- Cost: people in roles with fewer than 5 peers in their country are never flagged.

## Updates
- **2026-10-30, slicing, spread and pay changes:**
  - **Group by plus a filter for each dimension**, instead of one tab per segment. HR picks the rows (country, department, job title or tenure) and narrows who's counted with any combination of the four filters, for example "Engineering in India with 1–3 years, by job title". The currency rule is unchanged: one country is in its own currency; otherwise figures are converted to INR. An unknown filter value is a 404, as for countries.
  - **Pay spread:** each segment also has the 25th and 75th percentiles. The chart shows a bar for the middle half of salaries with a dot at the median, so a role with consistent pay looks different from one where pay is all over the place.
  - **Pay changes in the last 12 months** (`GET /insights/pay_changes`): salary changes effective in the last 12 months (UTC), by reason, not counting hires. Each change is compared with that employee's previous salary (a `LAG` window over their history). The card shows how many there were, the average % change, and how much they added to yearly pay, converted to INR. People who have since left are included, because the changes still happened.
- **Rupees read the Indian way:** full INR amounts use Indian digit grouping (₹53,07,247.34), and summary figures (tiles, chart axes, pay-change totals) use lakh and crore (₹53.07 L, ₹334.88 Cr) instead of million and billion. Other currencies keep their usual formatting.
- **Later ideas** (not built yet):
  - the yearly cost of bringing underpaid ★ people up to their role's median
  - clicking a segment row to open the directory filtered to those people
  - a compa-ratio (salary ÷ the role's median) per department
  - a country × department headcount heatmap
  - CSV export of any view
  - a gender pay gap, which needs data Horizon deliberately doesn't store
