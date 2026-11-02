# 0001. Rails API and React app in one repo

Status: Accepted · 2026-10-28

## Context
The brief asks for a backend and a React UI. We need to decide how the two fit together, in the code and when deployed.

## Decision
One repository with two apps:
- `backend/`: Rails 8.1 in API-only mode, serving JSON under `/api/v1`.
- `frontend/`: React + TypeScript, built with Vite.

In production both are served from the same domain. A reverse proxy sends `/api` to Rails and everything else to the built React files. In development, Vite's dev server forwards `/api` to Rails the same way.

## Options considered
- **React inside the Rails app** (for example with `vite_ruby`). One deploy, but the line between backend and UI gets blurry, and the API is harder to test and explain on its own.
- **Next.js + Rails API.** Next.js shines at server rendering and SEO. An internal tool behind a login needs neither, and it would add a Node server to run.
- **Two separate repos.** Cleaner ownership for big teams, but more overhead for one person, and the brief asks for one repository.

## Consequences
- Good: a clear API boundary, each side tested on its own, and TypeScript on the frontend.
- Good: same domain means no cross-origin (CORS) setup, and login can use normal cookies.
- Cost: two toolchains (Bundler and npm), two test suites and two CI jobs.

## Updates
- **2026-11-02, how it's served:** there's no separate reverse proxy. Since the deploy (ADR 0025, 0026), Rails serves the built React app itself, from one Docker image: `SpaController` returns the app's page for any path outside `/api`, and the hashed assets are cached for a year. Same domain and cookie login, as decided above.
- **2026-11-02, no hosted CI yet:** the checks run on the developer's machine (`bin/ci` for the backend, `pnpm typecheck`, `lint`, `test` and `build` for the frontend), before every PR. A GitHub Actions workflow running both is the next step.
