# UniWare registration API contract

POST `/api/auth/register` accepts JSON:

```json
{
  "first_name": "Putter",
  "last_name": "Smith",
  "email": "putter@chula.ac.th",
  "password": "unusual phrase here",
  "department": "Engineering"
}
```

First and last names are required, trimmed, and limited to 150 characters.
The backend rejects digits and specified special characters in names.
Department is optional (maximum 255 characters).
Email is normalized to lowercase. The current backend permits chula.ac.th
and its subdomains; it does not require a numeric student ID.
Passwords require at least 10 characters and must not be entirely numeric,
common, or too similar to user information. Django is authoritative for validation.
The frontend checks basic rules and displays backend field errors.

A successful 201 response is the user object directly:
`id`, `email`, `first_name`, `last_name`, `department`,
`is_admin`, `is_provider`, `is_borrower`, `account_status`, `date_joined`.
IDs are UUID strings. Self-registration creates a borrower without provider/admin
capabilities. Registration does not log the user in.

Validation errors, including duplicate email, return HTTP 400:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "An account with this email already exists.",
    "details": { "email": ["An account with this email already exists."] }
  }
}
```

## Local connection

Copy frontend/.env.example to frontend/.env if local overrides are needed:
```env
VITE_API_BASE_URL=/api
VITE_USE_MOCK_API=false
```

Start the backend with Docker Compose in the backend repository, then run
`npm ci` and `npm run dev` in this repository's frontend directory.
The existing Vite proxy forwards /api to http://localhost:8000.
Django must trust http://localhost:5173 for CSRF-protected requests.
Requests include cookies and an existing csrftoken cookie as X-CSRFToken.
Login/session UI is not implemented yet.

Explicitly set VITE_USE_MOCK_API=true for a UI-only demonstration.
Mock mode neither persists accounts nor runs Django's password validators.
Restart Vite after environment changes. Keep actual .env files out of Git.
