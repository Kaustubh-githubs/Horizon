# 0025. Deploying to Railway

Status: Accepted · 2026-11-01

## Context
Horizon needs a public deployment for the interview and the demo video, for a few weeks at most. The plan had an Azure VM (ADR 0001 kept the app same-origin so any single host works). For a short demo, the simpler the better, but it must not fall asleep in front of the interviewer. The data is small: the seeded database is about 18 MB.

## Decision
- **Railway**: one service built from a Dockerfile, plus a Railway Postgres in the same project. It stays on (no idle sleep). The Hobby plan includes $5 of usage a month, which a small Rails app and Postgres fit for a few weeks. It deploys from GitHub on every push to master.
- **One image for both apps** (`Dockerfile` at the repo root):
  - Build steps: Node builds the React app, then the Rails steps from `backend/Dockerfile` follow, and the built app is copied into `public/`.
  - One origin: the browser sees a single site, so the session cookie, the cross-site write check (ADR 0009) and the no-CORS setup (ADR 0001) all work without a proxy.
  - Caching: the app's JS and CSS have hashed names, and Rails' static file server caches them for a year. The shell (`index.html`) is renamed `spa.html`, and `SpaController` sends it with `Cache-Control: no-cache` for the root and every page the browser opens directly (`/employees/42` after a refresh). Left as `index.html`, the static file server would answer `/` with it and cache it for a year, so a deploy wouldn't show until the cache expired.
  - Unknown `/api/…` paths still get the API's 404, not the shell.
- **Production database from `DATABASE_URL`**, which Railway provides as a reference to its Postgres. `database.yml` no longer names a production user or database.
- **Database setup on boot.** The entrypoint runs `db:prepare` (create or migrate, including the `pg_trgm` extension). With `SEED_ON_BOOT=true` it then runs `db:seed`: 10,000 employees on the first boot (about 2 s). Later boots only refresh the reference data, because the seed skips employees once there are any. It's a flag, not a default, so a real deployment never seeds by surprise.
- **Health check** on `/up`, the Rails liveness check. `assume_ssl` (Railway terminates HTTPS) means it isn't redirected to HTTPS.
- **Secrets stay in Railway's variables:** `RAILS_MASTER_KEY` (for `secret_key_base`), and optionally `DEMO_USER_PASSWORD`. `.dockerignore` keeps the master key and local files out of the image.
- **Checked locally without Docker:** the built app was copied into `public/` as the image does, and Rails was run in production mode.
  - Pages: `/up` 200; `/` and `/employees/42` serve the shell with no-cache; the hashed assets carry a year's cache; an unknown API path gives 404.
  - API: signing in gives a secure, HTTP-only, SameSite=Lax cookie with a 30-day expiry; the API answers with it; a cross-site write gets 403.

## Options considered
- **Render's free tier.** $0, but the service sleeps after 15 minutes idle and takes about a minute to wake, a bad first impression in a live demo. Its free Postgres expires after 30 days.
- **Heroku.** Rails' classic home. About $12 a month to stay awake (Basic dyno and Postgres); the $5 dyno sleeps.
- **Fly.io.** No free allowance for new accounts, and its managed Postgres starts at $38 a month.
- **Netlify for the React app, with the API elsewhere.** Two deploys and an `/api` proxy whose forwarded host must be right for the cross-site write check. More moving parts for no gain here.
- **An Azure VM (the original plan).** Full control, but we'd run Postgres, TLS and updates ourselves, which is too much for a few weeks.

## Consequences
- Good: one push to master deploys both apps. One URL serves the demo, always awake, at about $5.
- Cost: Railway bills by usage beyond the included credit, so the project should be removed after the interviews.
- Cost: the login rate limit is counted per process (ADR 0009); one Railway instance is one process group, which is fine at this size.
