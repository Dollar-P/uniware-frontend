# US1-3 — Logout

- The authenticated account page has an outlined Log out button using the
  --color-logout theme variable (#8B0000).
- POST /api/auth/logout includes the session cookie and current X-CSRFToken.
  Django invalidates the session; the frontend accepts the empty 204 response.
- Successful logout clears the displayed user and replaces the current route
  with #login. An already expired session (401) also returns to sign in.
- The button is disabled during logout. Network, CSRF and server errors remain
  visible on the account page so users can retry without a false success.
- Pending session checks cannot restore stale user data after logout begins.
- Protected account navigation and refresh continue to verify /api/auth/me.

## Local setup and verification

Use http://localhost:5173, matching Django's CSRF_TRUSTED_ORIGINS.
Using another host or port requires adding that exact origin to the backend
configuration and recreating the API container.

All 35 frontend tests, lint and production build passed.
Live browser verification against Django passed: successful logout (204),
replay of the old session rejected (401), protected navigation and refresh
redirected to sign in, and button color matched #8B0000.
The temporary test account was removed afterward.

The backend's existing LogoutView implements server-side invalidation;
no backend source changes were required.
