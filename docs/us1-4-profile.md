# US1-4: View and edit profile (frontend)

Branch: us1-4, based on the shared fix/session-bug prerequisite. This branch is
independent of us3-2 and us3-3. No backend changes.

Open #account → View and edit profile, or #profile after signing in.
The page uses the existing theme, outlined controls, and responsive layout.
First name, last name, and department are editable, matching the backend model's
EDITABLE_PROFILE_FIELDS. Email, capability flags, and account status are read-only.
IDs, date joined, and password are never included in PATCH requests.

## Proposed API contract / backend dependency

GET /api/profile and PATCH /api/profile use the existing bare UserSerializer shape.
PATCH accepts first_name, last_name, department; unknown/restricted keys should
be rejected by the backend. Names follow the existing name validator; department
is optional and limited to 255 characters. Errors use {error:{code,message,details}}.
Cookies and X-CSRFToken accompany updates.

The current backend has neither profile endpoint. On GET 404 the frontend uses
GET /api/auth/me for real read-only data. PATCH 404/405 shows an unavailable
message and keeps the draft. No fake save, backend mutation, or localStorage
profile persistence is used. Backend validation/serialization/security tasks
remain backend responsibilities.

Frontend tests verify view/prefill, save, invalid edits, server field errors,
restricted-key allowlisting, cancel, retry, and missing endpoints. API responses
are mocked for save tests; a successful live save cannot be verified until the
backend implements this contract. Route tests also check anonymous access and
preservation of drafts during browser-refocus session checks; late saves do not
update the parent session after navigating away.

Run npx vitest run src, npm run lint, npm run build. The unchanged base has two
unrelated failing assertions in MyRequests.test.tsx (old pending-status wording
and CHECKED_OUT versus the displayed CHECKED OUT). These are left outside scope.
