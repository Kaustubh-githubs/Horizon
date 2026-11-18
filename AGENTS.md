# Horizon

@CONVENTIONS.md

Decisions are in docs/adr. Don't work against one without saying so.

- Schema: read backend/db/schema.rb and docs/schema.md, not the migrations.
- Backend tests: cd backend && bundle exec rspec <file>:<line>
- Frontend tests: cd frontend && pnpm vitest run <file>
- Write the failing spec first, then stop so I can review it before any app code.
- Make the smallest change that passes. Don't touch files I didn't mention without saying why.
- After changing code, run the spec file you touched and RuboCop on the changed Ruby files before asking me to review.
- Never add a gem or an npm package without asking me first.
- Money is BigDecimal (strings in JSON), never Float. Dates use Date.current (UTC).
