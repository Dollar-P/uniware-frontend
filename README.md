# UniWare

**UniWare** คือเว็บแอปพลิเคชันสำหรับค้นหา จัดการ และขอยืมอุปกรณ์ภายในมหาวิทยาลัย เพื่อให้อุปกรณ์ของภาควิชา ห้องปฏิบัติการ และหน่วยงานต่าง ๆ เข้าถึงได้ง่ายขึ้น

ระบบมีผู้ใช้งานหลักสองบทบาท (ผู้ใช้หนึ่งคนอาจมีมากกว่าหนึ่งบทบาท):

- **Provider** — เพิ่มและจัดการอุปกรณ์ ตลอดจนพิจารณาคำขอยืม
- **Borrower** — ค้นหาอุปกรณ์ ดูรายละเอียด และส่งคำขอยืม

กระบวนการของผลิตภัณฑ์ที่วางแผนไว้:

```text
Register / Sign in
       ↓
Provider adds equipment → Equipment catalog / detail
                                    ↓
                           Borrower submits request
                                    ↓
                           Provider approves / rejects
                                    ↓
                              Checkout → Return
```

> แผนภาพแสดง **เป้าหมายของระบบทั้งหมด** ไม่ใช่การยืนยันว่าทุกขั้นเชื่อมต่อ Backend จริงแล้ว ดูสถานะการพัฒนาด้านล่าง

## Development status

| Feature | Status | Notes |
|---|---|---|
| Register / Sign in / Sign out | Implemented in frontend | ใช้ Backend authentication/session จริงเมื่อรันร่วมกับ API |
| Provider equipment management | Implemented in frontend | เพิ่ม ดู และแก้ไขอุปกรณ์ |
| Equipment catalog / detail | Implemented in frontend | ค้นหา/ดูรายการและรายละเอียดที่เชื่อม Equipment API |
| Provider request inbox / detail (US5-1, US5-2) | Frontend ready for mock testing | มี UI, API service และ adapter; รอทดสอบกับ Provider API จริง |
| Provider approve / reject (US5-3, US5-4) | Frontend ready for mock testing | UI และ Dialog พร้อม; ยังไม่ถือว่าตัดสินใจในฐานข้อมูลจริงได้ |
| End-to-end borrowing, checkout / return | In development / planned | ต้องตรวจความพร้อมจาก Backend และงานส่วนอื่นของทีม |

**หมายเหตุ:** โหมดจำลองของ Provider Requests ไม่เปลี่ยนสถานะใน Database; ข้อมูลจำลองอยู่ในหน่วยความจำและจะรีเซ็ตเมื่อโหลดหน้าใหม่ การผ่าน Frontend Tests ไม่เท่ากับผ่าน End-to-End Integration

## Tech stack

- **Frontend:** React, TypeScript, Vite, CSS
- **Frontend testing:** Vitest, React Testing Library
- **Backend (separate repository):** Django, Django REST Framework, PostgreSQL
- **Communication:** REST API พร้อม Session Cookie/CSRF ตามข้อกำหนดของ Backend

Frontend repository: [uniware-frontend](https://github.com/Dollar-P/uniware-frontend)  
Backend repository: [uniware-backend](https://github.com/chalkp/uniware-backend)

## Architecture

```text
React pages / components
           ↓
Frontend services (HTTP + session/CSRF)
           ↓
Response adapters / TypeScript types
           ↓
Django REST API
           ↓
PostgreSQL
```

สำหรับ **Provider Requests** มีการสลับแหล่งข้อมูลที่ Service Layer:

```text
Provider Requests UI
         ↓
providerRequestsApi.ts
         ├── Mock provider requests (development / tests)
         └── Real Provider API (after backend integration)
         ↓
providerRequestsAdapter.ts → UI-facing types
```

Component ไม่ควรเรียก `fetch()` กระจายตามหน้าต่าง ๆ; ให้เรียกผ่าน `services/` และใช้ชนิดข้อมูลร่วมจาก `types/`

## Project structure

```text
.
├── README.md
├── docs/                         # API contract / feature documentation
└── frontend/
    ├── .env.example
    ├── package.json
    ├── vite.config.ts
    ├── vitest.config.ts
    └── src/
        ├── pages/                # Screens and page-level tests
        ├── components/           # Reusable UI components
        │   ├── auth/
        │   ├── equipment/
        │   └── requests/
        ├── services/             # API clients and response adapters
        ├── types/                # Shared TypeScript types
        ├── utils/                # Non-UI helpers and validation
        ├── test/                 # Test setup and fixtures
        ├── App.tsx               # Hash routes / session-aware navigation
        └── main.tsx
```

## Getting started

ต้องมี **Node.js/npm** และ Backend ที่เข้าถึงได้ หากต้องการ Login และใช้ข้อมูลจริง

จาก Root ของ Frontend Repository:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

ถ้าติดตั้ง Dependencies แล้วและมี `node_modules` อยู่ สามารถใช้ `npm run dev` ได้ทันทีโดยไม่ต้อง `npm install` ซ้ำ

เปิด <http://localhost:5173> โดย Vite จะ Proxy คำขอ `/api` ไปยัง `http://localhost:8000` ตาม `vite.config.ts` ของโปรเจกต์

> ต้องเปิด Backend แยกต่างหากสำหรับ Authentication, Session และ Equipment API แม้จะเปิด Mock Provider Requests อยู่ก็ตาม

### Environment variables

ตั้งค่าที่ `frontend/.env` โดยดูตัวอย่างจาก `frontend/.env.example`:

```env
VITE_API_BASE_URL=/api
VITE_USE_MOCK_API=false
VITE_PROVIDER_REQUESTS_MOCK=true
```

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL สำหรับ Frontend API calls; ค่า `/api` ใช้ Vite Proxy ในเครื่อง |
| `VITE_USE_MOCK_API` | Mock flag ของฟีเจอร์เดิม (แยกจาก Provider Requests) |
| `VITE_PROVIDER_REQUESTS_MOCK` | `true` ใช้ข้อมูลจำลองสำหรับ Provider Requests; `false` เรียก Backend จริง |

เมื่อ Backend ของ Provider Requests พร้อมและมี API Contract ตรงกัน ให้ตั้ง `VITE_PROVIDER_REQUESTS_MOCK=false` แล้ว Restart Vite

**อย่า Commit `frontend/.env`, Password, Secret Key หรือข้อมูลลับ** เพราะค่าที่ขึ้นต้นด้วย `VITE_` สามารถถูกอ่านจาก Browser ได้

## Available screens and navigation

หลังลงชื่อเข้าใช้:

- **Catalog** — ดูอุปกรณ์และเปิดรายละเอียด
- **My Equipment** — จัดการอุปกรณ์ของ Provider
- **Borrow Requests** — ดูคำขอยืมที่เข้ามาและตัดสินใจ (เฉพาะ Provider)
- **Account** — ดูข้อมูลผู้ใช้และออกจากระบบ

Frontend ใช้ **Hash Navigation** ใน `App.tsx` ยังไม่ได้ติดตั้ง React Router

```text
#catalog
#my-equipment
#provider-requests
#provider-requests/<request-id>
#account
```

ผู้ใช้ที่ไม่มีสิทธิ์ Provider ไม่ควรเข้าถึง Provider Screens; Backend ต้องตรวจสิทธิ์และ Ownership ซ้ำเมื่อเปิดใช้ API จริง

## Provider Requests integration contract

Frontend ปัจจุบันเรียก Service Functions ดังนี้:

| Function | Expected HTTP operation | Status |
|---|---|---|
| `listProviderRequests()` | `GET /api/provider/requests` | Proposed; confirm with Backend |
| `getProviderRequest(id)` | `GET /api/provider/requests/{id}` | Proposed; confirm with Backend |
| `approveProviderRequest(id)` | `POST /api/provider/requests/{id}/approve` | Proposed; confirm with Backend |
| `rejectProviderRequest(id, reason)` | `POST /api/provider/requests/{id}/reject` | Proposed; confirm with Backend |

ก่อนเปิด Real API ต้องยืนยันกับ Backend Owner เรื่อง **Endpoint / trailing slash, Response Fields, Pagination, Reject Body (`reason` หรือ `decision_reason`), Error Shape และ CSRF**

`providerRequestsAdapter.ts` ใช้แปลงข้อมูลจาก API ให้เป็น Shape กลางของ Frontend; เมื่อ Contract เปลี่ยนควรปรับ Service และ Adapter ก่อนแก้ UI

## Tests, lint and build

รันจาก `frontend/`:

```powershell
npm run test:run
npm run lint
npm run build
```

หาก Vitest บน Windows เปิด Worker พร้อมกันไม่สำเร็จ ลอง:

```powershell
npm run test:run -- --maxWorkers=2 --no-file-parallelism
```

**ก่อน Merge** ให้ตรวจว่า Tests, Lint และ Build ผ่านจริง และลองใช้หน้า UI ใน Browser; สำหรับฟีเจอร์ที่พึ่งพา Backend ต้องมี Integration Tests ก่อนถือว่าเสร็จสมบูรณ์

## Git workflow

ไม่แก้โค้ดโดยตรงบน `main`; สร้าง Branch แล้วเปิด Pull Request ให้ทีม Review

```powershell
git switch main
git pull --ff-only origin main
git switch -c feature/<story-or-feature>

# after implementing and testing
git add <relevant-files>
git commit -m "feat(usX): describe one meaningful change"
git push -u origin feature/<story-or-feature>
```

ใช้ Commit ที่มีขอบเขตชัดเจน เช่น `feat(us5): add provider request pages`, `test(us5): cover request decisions` หรือ `docs: update project README`

ก่อนเปิด PR:

1. ตรวจ Diff และไม่ Commit `.env` หรือ `node_modules`
2. รัน Tests, Lint, Build
3. อธิบาย Feature ที่เพิ่ม, หลักฐานการทดสอบ และจุดที่ยังใช้ Mock / รอ Backend
4. ให้เพื่อน Review และ Merge ผ่าน PR เท่านั้น

ดูรายละเอียดเพิ่มเติมใน [`docs/api-contract.md`](docs/api-contract.md) และเอกสารฟีเจอร์ภายใต้ `docs/`
