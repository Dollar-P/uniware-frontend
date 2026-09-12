# US3-4: Equipment Detail

This guide explains how to open the Equipment Detail page during local development.

## Prerequisites

Start the backend:

```powershell
cd C:\Coxx\seProject\uniware-backend
docker compose up
```

Start the frontend in a second terminal:

```powershell
cd C:\Coxx\seProject\uniware-frontend\frontend
npm run dev
```

The application is available at `http://localhost:5173`.

## 1. Log in

Open:

```text
http://localhost:5173/#login
```

For seeded demo data, use:

```text
Email: borrower1@chula.ac.th
Password: Str0ngPassw0rd!
```

Login is required or you will get status 403

## 2. Find an equipment ID

Open the equipment API:

```text
http://localhost:8000/api/equipment
```

The equipment list is paginated. Find an item inside the `results` array:

```json
{
  "id": "68d7569a-8112-479a-85b8-a84746f50f82",
  "asset_id": "UNIWARE-0021",
  "name": "LiPo Battery Charger iCharger 4010"
}
```

Use the UUID from `id`. Do not use `asset_id`; values such as `UNIWARE-0001`
are display identifiers and are not accepted by the detail endpoint.


## 3. Open the detail page

Append the UUID to the frontend hash route:

```text
http://localhost:5173/#equipment/68d7569a-8112-479a-85b8-a84746f50f82
```

The frontend calls:

```http
GET /api/equipment/{id}
```

The page displays the equipment asset ID, name, status, model, category, location,
and description.

## EXTRA
you can view full raw JSON from API endpoint.
```text
http://localhost:8000/api/equipment/68d7569a-8112-479a-85b8-a84746f50f82
```
