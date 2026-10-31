# 0009. Login with Rails' built-in session cookies

Status: Accepted · 2026-10-28

## Context
Salary data is sensitive, and the app will be on a public URL for review. It needs a login, but only for one kind of user.

## Decision
Use the authentication generator that ships with Rails 8. The user signs in with email and password (stored with `has_secure_password`). A `sessions` table tracks each login, and the browser holds a signed, HTTP-only, `SameSite=Lax` cookie. Because the React app and the API share a domain (0001), the cookie is sent automatically.

There's no sign-up page. Users are created by the seed script, and a demo login is listed in the README.

## Options considered
- **JWT stored in the browser (localStorage).** Common in SPAs, but any injected script can read the token, and logging a token out before it expires needs extra work.
- **Devise.** Feature-rich, but a lot of machinery for one login form. The Rails 8 generator is small enough to read and explain line by line.
- **No login.** Not acceptable with salary data on a public URL.

## Consequences
- Good: simple, well-understood security. JavaScript can't read the cookie, and sessions can be revoked by deleting the row.
- Cost: API-only Rails leaves out cookie support, so we add the cookies middleware back.
- Cross-site request forgery: `SameSite=Lax` stops browsers sending the cookie on POST, PATCH or DELETE requests that come from another site. That's enough on one domain. We'd add CSRF tokens if the API ever moves to another domain.
- Not covered: password reset, multi-factor login and SSO.

## How it was built (2026-10-28)
- We ran `bin/rails generate authentication`, then adapted it for a JSON API:
  - Removed the generated HTML `SessionsController`, the `PasswordsController` (password reset is out of scope) and their routes.
  - The `Authentication` concern returns a JSON 401 instead of redirecting to a login page.
  - It's included in `Api::BaseController`, so every endpoint requires login unless it opts out with `allow_unauthenticated_access` (only `/api/v1/health` and logging in do).
- Endpoints:
  - `POST /api/v1/session` logs in and sets the cookie
  - `GET /api/v1/session` returns the current user and persona
  - `DELETE /api/v1/session` logs out and deletes the session row
- The cookie is signed, HTTP-only, `SameSite=Lax`, and HTTPS-only in production.
- Logging in is rate-limited to 10 attempts per 3 minutes. A wrong email and a wrong password get the same message, so the response doesn't reveal which accounts exist.
- Passwords must be at least 12 characters and are stored as bcrypt hashes.
- The seed creates the "HR Manager" persona and a demo user (`hr@acme.test`). The password comes from `DEMO_USER_PASSWORD`, with a local default.
- Rate limiting uses the Rails cache. It's off in tests (null cache), and production needs a shared cache store before running more than one server process.

## Update (2026-11-01, code review)
- **Sessions expire.** A session unused for 2 weeks, or older than 30 days, counts as signed out: it's deleted on its next use, and the cookie's expiry matches the 30 days instead of the generator's 20 years. A session in use records its activity at most once an hour, so this costs one write an hour, not one per request. Signing in also deletes everyone's expired sessions, so old rows don't pile up.
  - Considered: 1 day idle and 7 days at most, or one working day. Both are stricter than an internal tool used daily by one HR team needs.
- **Writes must come from the app's own origin.** `Api::BaseController` refuses a POST, PATCH or DELETE whose `Origin` header isn't the app's own, with a 403 in the usual error shape. Browsers always send `Origin` on cross-site writes, so a form or script on another site is stopped even if SameSite were missing or the site counted as same-site (another subdomain). Signing in is covered too (login CSRF). Requests without an `Origin` (curl, server to server) are allowed: they can't carry a victim's cookie. The app's origin is Rails' `request.base_url`, so a proxy in front of Rails must pass the page's host on: Vite's dev proxy does with `xfwd` (X-Forwarded-Host), and a production reverse proxy must keep `Host` or set `X-Forwarded-Host`. Without that the check refuses the app's own writes, which the browser check caught before this shipped.
  - Considered: Rails' CSRF tokens. These are the classic answer, but they need a token endpoint and a header on every client request. The Origin check gives the same protection for a JSON API in a few lines.
- **The login rate limit has its own store** (`SessionsController::LOGIN_ATTEMPTS`, in memory), so it works in every environment and has a spec. With more than one server process it would need a shared store (Solid Cache or Redis).
- **Every route's sign-in requirement is tested.** A spec builds its list from the routes, so a new endpoint is covered the day it's added.
- **Salaries stay out of the logs:** `salary` and `amount` join the filtered parameters, alongside passwords and emails.
