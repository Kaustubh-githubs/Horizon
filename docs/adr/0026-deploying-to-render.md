# 0026. Deploying to Render

Status: Accepted · 2026-11-01 · Supersedes [0025](0025-deploying-to-railway.md)

## Context
ADR 0025 chose Railway, but Railway has paused new sign-ups while it recovers from an incident, with no date to reopen. Horizon still needs a public deployment for the interview and the demo, for a few weeks at most. Nothing built for 0025 is tied to Railway apart from its config file: one root `Dockerfile` builds the React app and serves it from Rails with the API, production reads `DATABASE_URL`, `/up` is the health check, and `SEED_ON_BOOT` loads the demo data.

## Decision
- **Render**, from a Blueprint (`render.yaml`): one web service built from the root `Dockerfile`, and a Postgres. Creating the Blueprint creates both and connects them: `DATABASE_URL` is the database's connection string.
- **Both in Singapore**, the region closest to ACME's HR team in India, so the app reaches the database over Render's private network.
- **Free plans** for the web service and Postgres. The demo needs a few weeks, and the seeded database is about 18 MB.
- **`RAILS_MASTER_KEY` is entered when the Blueprint is created** (`sync: false`), never committed. `SEED_ON_BOOT=true` is in the Blueprint, because this deployment exists to show the demo data.
- **Everything else from ADR 0025 stands**: one image, the shell served with no-cache by `SpaController`, a year's caching for hashed assets, `db:prepare` on every boot, and `/up` not redirected to HTTPS.
- `railway.toml` is removed; it's in the git history if Railway is wanted later.

## Options considered
- **Wait for Railway.** It's always on for about $5 a month, but there's no reopening date, and the interview date is fixed.
- **Heroku.** About $12 a month to stay awake, and it needs a card. A reasonable fallback if the free plan's sleep becomes a problem.
- **Fly.io.** No free allowance for new accounts, and managed Postgres from $38 a month.
- **An Azure VM.** We'd run Postgres, TLS and updates ourselves.

## Consequences
- Good: the same image and settings deploy here, with one config file, at no cost.
- Cost: a free web service sleeps after 15 minutes without traffic and takes about a minute to wake. Before a demo, open the app a couple of minutes early, or move the service to a paid instance for that week.
- Cost: the free Postgres expires after 30 days. That's enough for the interviews; after that it would need a paid plan or a fresh database (the seed rebuilds the data).
