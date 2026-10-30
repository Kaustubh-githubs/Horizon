# 0007. Comparing pay across currencies

Status: Accepted · 2026-10-28

## Context
ACME pays people in several currencies. An "average salary" across INR and USD amounts is meaningless. But HR still needs some org-wide numbers, such as total payroll cost.

## Decision
- Pay is compared within a country, in local currency. Per-country and per-title insights never convert.
- Org-wide figures are converted to USD using a fixed `exchange_rates` table (rate to USD plus an "as of" date). The UI labels these numbers as converted and shows the rate date.

## Options considered
- **Convert everything to USD.** One currency everywhere, but exchange-rate swings would make pay look like it changed when it didn't, and comparing an Indian salary to a US one in USD says little about whether either is fair.
- **Live exchange rates from an API.** Always current, but it adds an outside dependency, results change from day to day, and tests can't rely on fixed numbers.
- **No org-wide view at all.** Simplest, but then "what does payroll cost us?" can't be answered.

## Consequences
- Good: per-country numbers are exact and stable, and tests stay predictable.
- Good: org-wide totals are possible and clearly labelled as approximate.
- Cost: rates go stale. Updating them is a data change, and a live rate API can be plugged in later.

## Updates
- **2026-10-30, INR for converted figures:** the insights dashboard converts figures across countries to **INR** rather than USD, because HR thinks in rupees and India is the largest country. Single-country figures still never convert. See ADR 0019.
