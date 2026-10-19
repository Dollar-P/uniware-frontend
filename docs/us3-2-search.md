# US3-2 — Catalog search (frontend)

Branch `us3-2` starts independently from `fix/session-bug`, which includes the current main plus the browser-refocus form preservation fix. No backend files were changed.

## UI

The catalog has a labeled name/model search field, explicit Search (or Enter) submission, and Clear search. Whitespace is trimmed; an empty query browses the catalog. Submitting or clearing resets pagination; subsequent pages and retries retain the submitted query. Pending and failed searches never show stale results. No-match feedback is separate from an empty catalog. Existing Google Sans, color variables, outlined controls and responsive layout are retained.

## Proposed API contract — requires backend implementation

`GET /api/equipment?page=1&search=microscope` with session credentials.

- `search` is optional. Omit it for empty/whitespace-only input.
- Match case-insensitive substrings of **name OR model**. Return the existing paginated equipment response.
- Apply search to the borrower-visible queryset **before** counting and paginating. Archived and disabled equipment must never appear, including for provider accounts browsing the shared catalog.
- Preserve server pagination, errors and access control. Do not search only the current page or substitute provider inventory.

At implementation time, the backend list endpoint ignores `search`. This branch sends the agreed frontend contract, but live search requires the backend query handling. Frontend tests mock server responses; they do **not** prove server case-insensitivity or visibility enforcement. Backend acceptance tests must include matching archived/disabled fixtures as well as exact, partial, mixed-case, model and no-match cases.

## Checks

From `frontend/`: `npx vitest run src/pages/CatalogSearch.test.tsx src/pages/EquipmentDiscovery.test.tsx src/services/equipmentSearch.test.ts src/services/equipmentApi.test.ts`, `npm run lint`, `npm run build`.

The unchanged base has two unrelated failing assertions in `MyRequests.test.tsx`: old pending-status wording and `CHECKED_OUT` versus displayed `CHECKED OUT`. They are intentionally outside this branch.

When integrating with `us3-3`, combine the search and filter options in `listEquipment`, submit them in the same request, and retain both in pagination/results keys. Neither independent story branch includes the other's UI yet.
