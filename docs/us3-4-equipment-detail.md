# Equipment catalog and details (US3-1 / US3-4)

Start Django and PostgreSQL with `docker compose up --build` in the backend
repository. In this repository's `frontend/` directory, run `npm ci` and
`npm run dev`. Open http://localhost:5173 and sign in with a real account.
Use `VITE_API_BASE_URL=/api`; Django must trust the frontend origin for
CSRF-protected actions such as logout.

## Navigation

- Account → Browse equipment → catalog card → equipment detail.
- `#catalog` displays the paginated authenticated catalog.
- `#equipment/<UUID>` supports direct links and refresh. Use the equipment
  UUID, not its display Asset ID.
- Detail → Back to catalog; the UniWare logo links to the account page.
- Providers retain `#my-equipment`, including add/edit and inventory pagination.

The catalog displays readable status labels, categories and locations. Its
count comes from the API's total, with Previous/Next controls for page access.
The backend excludes archived and disabled items from the catalog and detail
endpoints. Visible items may be reserved, checked out or under maintenance;
visibility does not mean immediate availability.

Detail pages fetch fresh data from `GET /api/equipment/{id}`. Missing and
hidden items show Equipment not found. Loading and API failures have explicit
states, with retry for failures. Session expiration redirects to sign in.
Requests ignore outdated responses after navigation.

## Integration decisions

Both feature branches are merged into main with their histories preserved.
The shared equipment types, error class and API client retain all provider
operations. Catalog cards use the dedicated detail route instead of a second
detail modal. Request-to-borrow functionality is outside Sprint 1 and has no
inactive action in these pages. Catalog styles use scoped class names and the
existing theme variables; status labels and outlined badges are shared.

## Checks

Run `npm run test:run`, `npm run lint`, and `npm run build` in frontend/.
Tests cover pagination, empty/error/retry states, navigation, hidden/missing
details, malformed routes, stale responses, and authentication guards, together
with the existing account and provider workflows.
