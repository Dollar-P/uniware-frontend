# US2-4: Archive equipment

My Equipment includes an Archive action for each unarchived item. Selecting it
opens an inline confirmation identifying the item by name and asset ID. The
confirmation explains borrower visibility, retained history, and that archived
items cannot be edited or restored. Cancel makes no API call and returns keyboard
focus to Archive.

Confirm sends `POST /api/equipment/{id}/archive` with session cookies and the
CSRF token. While the request is pending, confirmation controls are disabled and
duplicate submissions are blocked. A successful response updates that inventory
row without removing it, changing pagination, or refetching the list. A status
message announces success; archived rows no longer offer Edit or Archive.

Reserved and checked-out items have a disabled Archive button with an explanation.
The backend remains authoritative for ownership and active request checks, including
approved requests whose equipment status is still Available. Failures display the
backend message in the confirmation, preserve the row, and allow retry or cancel.

This requires the backend US2-4 archive endpoint. Borrower catalog/search/filter
and detail visibility are enforced by that backend; the frontend continues using
the existing catalog endpoints.

Tests in `MyEquipmentPage.test.tsx` cover confirmation/cancellation, keyboard
focus, pending submission, successful archive, failures/retry, blocked statuses,
and archived rows after reload. `equipmentApi.test.ts` verifies the route,
HTTP method, session/CSRF headers, returned representation, and error parsing.
