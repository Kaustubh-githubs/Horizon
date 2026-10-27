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
- Cross-site request forgery: `SameSite=Lax` stops other sites from sending the cookie on POST, PATCH or DELETE requests, and the API only accepts JSON. That's enough on one domain. We'd add CSRF tokens if the API ever moves to another domain.
- Not covered: password reset, multi-factor login and SSO.
