# Horizon: Salary Management for ACME

## Why we're building this
ACME's HR team manages pay for about 10,000 employees across several countries in Excel. Horizon gives the HR Manager one place to keep that data accurate and to answer questions about how we pay people.

## Who it's for
The HR Manager, who owns pay data for the whole company and is the only user for now. What might hurt about the spreadsheets today:
- Job titles are typed in different ways, so comparing pay by role isn't reliable.
- A raise overwrites the old number, so pay history is lost.
- Salaries are in different currencies, so simple questions take manual work.

## Questions it should answer
- What do we pay for a role in a country (lowest, median, average, highest)? Used for offers and raises.
- What does payroll cost per country and department?
- Who is paid well below peers with the same title in the same country?
- How has someone's pay changed over time, and why?

## What's in the first version
- **Login.** Each user has a persona (only "HR Manager" for now), so permissions can be added later.
- **Employee directory** that stays quick at 10,000 rows: search, filter by country, department, title or status, sort, and paging. Summary cards above it count the same people by country and department.
- **Add, edit and view employees,** with country, department and title picked from fixed lists so data stays clean.
- **End employment instead of deleting.** The record is kept, read-only, with a last working day of today or earlier.
- **Salary history.** Each change has an amount, currency and reason, and takes effect on the day it's recorded. The latest one is the current salary. A promotion also updates the job title.
- **Pay insights dashboard.** Group by country, department, job title or tenure, filtered by any combination of them: headcount, lowest/25th/median/75th/average/highest pay and total payroll, plus the salary changes of the last 12 months by reason. One country is shown in its own currency; figures across countries are converted to INR from a fixed, dated exchange-rate table. People paid more than 40% below or above the median for their role in their country are flagged with a ★, on the dashboard and on their profile.
- **Department budgets** (a good-to-have beyond the brief). HR sets this year's budget for each department in INR and sees whether today's payroll is over, near or under it, how many months it lasts, the headcount, the combined budget for the company, and who changed each budget and when.
- **Seed script** that creates the same 10,000 realistic employees on every run, in seconds.

"Salary" means annual gross base pay in local currency, compared within a country.

## UI considerations
- **Three screens:** Employees, Employee details (profile, salary history, change history) and Insights. Built for a laptop first.
- **Directory feels like a better spreadsheet:** filters update the table instantly and live in the URL, so a refresh or shared link keeps the view.
- **Money always shows its currency.** Local and converted amounts are never mixed.
- **Forms help:** dropdowns for reference data, errors next to the field, and an old vs new salary preview with the % change and the average pay for the same role in the same country, with a warning on unusually big changes, so an extra zero is easy to spot.
- **Ending someone's employment asks for confirmation.** Every screen has clear loading, empty and error states, and an unexpected error shows a friendly page instead of crashing the app.
- **Insights lead with numbers, then charts,** with click-through from a country to its titles and from a flagged person to their profile.
- **Accessible and consistent:** keyboard-friendly, colour never the only signal, one component library (shadcn/ui).

## What we're leaving out for now
- **Payroll, tax and deductions.** A separate area with different rules per country. Going beyond base pay is a business call.
- **Bonus, equity and benefits.** Base pay only keeps totals unambiguous.
- **Live exchange rates.** Avoids depending on an outside service. Rates can come from an API later.
- **Multiple roles or regional access.** The brief has one persona, and the persona setup makes roles easy to add later.
- **Excel import.** A one-time migration problem to handle separately. The seed script covers the demo.
- **Future-dated and back-dated raises.** Scheduled raises would need a background job. Late approvals are paid as arrears through payroll.
- **Transfers between countries.** An employee's country is set when they're created and can't be changed. A move would change their currency and split their salary history across two currencies.
- **Future hire dates, and changing a hire date.** Employees are added on or after their start date, so their first salary record is never in the future. The hire date is fixed once saved, because salary history starts there.
- **Approvals and notifications.** Not needed with one user.
- **Phone layout, dark mode, other languages.** Nice extras that don't help the core job yet.

## Add-on: audit trail
Every change to an employee or salary records who made it, what changed (old and new values) and when. Records can't be edited or deleted from the app and are saved together with the change. Shown in a "Change history" card on the employee's profile, one entry per action (added, details edited, salary change, employment ended), it answers "who changed this salary, and when?". Department budgets keep the same kind of history (ADR 0020). Employees loaded by the seed start with an empty history.

## Assumptions (to confirm with ACME)
- One HR Manager, with no restricted regional users. If the team grows, the persona setup supports more users and permissions.
- One currency per country, and one country per employee at a time.
- Salary is annual base pay only, with no tax or deductions.
- Importing the existing Excel data isn't expected in this version.
