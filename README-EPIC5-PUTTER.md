# UniWare Sprint 2 — Putter's EPIC 5 Frontend patch

This patch targets the `uniware-frontend-main` snapshot supplied in chat.

- React/Vite/TypeScript; no additional packages or router.
- US5-1 inbox and US5-2 request detail.
- US5-3 approve confirmation / US5-4 reject-reason dialog.
- Shared Service -> Adapter -> UI boundary, mock fixture behind `VITE_PROVIDER_REQUESTS_MOCK=true`.
- The **real** authentication/session is still used. Sign in as an active provider; the mock flag only changes provider request endpoints.
- Mock decisions are in-memory and reset on full browser refresh.
- Chalk must confirm final `/api/provider/requests` paths, response fields, pagination shape, reject body and errors.

## Windows setup

From the existing FRONTEND git repository root:

```powershell
git status
git fetch origin --prune
git switch main
git pull --ff-only origin main
git switch -c feature/us5-provider-frontend
# Copy the .patch file to e.g. Downloads, then:
git apply --check "C:\Users\YOURNAME\Downloads\uniware_epic5_frontend.patch"
git apply "C:\Users\YOURNAME\Downloads\uniware_epic5_frontend.patch"
cd frontend
npm ci
Copy-Item .env.example .env  # skip if .env already exists
# In frontend/.env add: VITE_PROVIDER_REQUESTS_MOCK=true
npm run test:run
npm run build
npm run lint
npm run dev
```

Open `http://localhost:5173`, sign in with a provider account, and select **Manage borrow requests** (or go to `http://localhost:5173/#provider-requests`).

For API integration later, set `VITE_PROVIDER_REQUESTS_MOCK=false` and restart Vite. Do not turn off session authentication or provider checks for demos.

Note: `config/urls.py` and backend changes are not included in this Frontend patch.
