# US3-3 — Catalog filters (frontend)

Branch `us3-3` starts independently from `fix/session-bug` (current main plus the refocus fix). No backend changes.

## Controls and behavior

- Category and Location choices come from the existing authenticated `GET /api/categories` and `GET /api/locations` endpoints, each returning an unpaginated `[{ id, name }]` array.
- Availability uses existing catalog statuses: `AVAILABLE`, `RESERVED`, `CHECKED_OUT`, `MAINTENANCE`. No Archived or Disabled options.
- Apply filters submits the selected values together; Clear filters resets every control and returns to page one of the whole catalog. Applying new choices also resets pagination. Later pages and retries retain applied choices.
- Empty selections mean unrestricted for that field. Filters combine with **AND**, not OR. Availability means current status, not availability for a future date range.
- Reference-loading failure leaves catalog browsing working, disables Apply, and offers a retry. Unknown picker values are rejected before submission. Server errors (including stale/deleted references) are shown without silently removing filters. Clear remains available.
- A no-match message is distinct from an empty catalog. Older pending responses cannot replace newer results.
- The layout retains existing fonts, variable colors and outlined controls; selectors stack on narrow screens.

## Proposed API contract — backend work remains

`GET /api/equipment?page=1&category=<uuid>&location=<uuid>&status=AVAILABLE`

All filters are optional. `category` and `location` contain IDs from the reference endpoints (not their names). `status` uses one of the four values above. The frontend omits empty fields, encodes query values, includes session credentials and requests uncached results. Existing provider-inventory APIs are unchanged.

The backend must validate unknown/malformed reference IDs and unsupported statuses (400 using the existing error envelope), apply all filters to the borrower-visible queryset before pagination, and preserve accurate counts. Archived/disabled records must remain excluded. Authentication/authorization remains server-owned.

At implementation time the backend catalog ignores these query parameters. The UI and frontend request contract are implemented, but real filtering depends on adding backend handling. Frontend tests use mocked results to verify controls, requests, error states and pagination; **AND semantics and visibility must also be verified against real backend fixtures once implemented**. No local filtering of a single server page is used.

## Verification and integration

From `frontend/`: `npx vitest run src/pages/CatalogFilters.test.tsx src/pages/EquipmentDiscovery.test.tsx src/services/equipmentFilters.test.ts src/services/equipmentApi.test.ts`, `npm run lint`, `npm run build`.

Two unrelated failures are already present on the unchanged base in `MyRequests.test.tsx`: outdated pending-status wording and a raw `CHECKED_OUT` expectation where the UI displays `CHECKED OUT`.

This branch is independent of `us3-2`. When merging both later, combine the search and filter service options, send all active criteria in one request, preserve both through pagination and include both in result keys. Keep Clear search scoped to search and Clear filters scoped to filters.
