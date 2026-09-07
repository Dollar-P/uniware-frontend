# US1-2 — Login

The sign-up page links to #login through an outlined Sign in button, with
"if you already have registered an account" beneath it. The login page keeps
the shared split layout, logos, typography and theme, with only University
Email and Password inputs and a link back to #signup.

## Implementation

- POST /api/auth/login submits email and password; Django verifies the password
  and issues its session cookie. Invalid credentials use the backend error message.
- Requests include cookies and an existing CSRF token. Passwords and session
  credentials are never stored in localStorage or sessionStorage.
- GET /api/auth/me restores authentication after refresh and on window focus.
- #account is protected by a session check. Anonymous or expired sessions
  redirect to #login. Service failures hide protected content and offer retry.
- The account page displays identity and backend capability flags. Django
  remains responsible for API authorization; frontend routing is not a security boundary.
- Login uses the real API regardless of registration's optional mock setting.
  A mock registration does not create an account that can log in.

The existing backend implements the Login API, password verification, session
authentication and authenticated endpoint permissions. No backend changes were
needed for this story. Logout and equipment pages belong to subsequent stories.

## Verification

Run npm run test:run, npm run lint, and npm run build in frontend/.
Tests cover login validation, invalid credentials, successful login navigation,
session restoration, protected access, expiry, and service failure/retry.

For live acceptance, start the Django backend and database, use a real registered
or seeded account, and run the frontend with VITE_API_BASE_URL=/api.
Check invalid login, valid login, refresh on #account, and anonymous access in
a fresh browser context. Existing backend login tests are in
apps/accounts/tests/test_us1_2_login.py.

Live browser acceptance passed against Django on 2026-09-07 using a temporary
account: invalid password rejection, successful login, session restoration
after refresh, and anonymous redirection after removing browser cookies.
The temporary account was removed afterward. The standalone backend test
suite has not been run as part of this frontend change.
