# UniWare

UniWare คือระบบสำหรับจัดการการค้นหาและยืมอุปกรณ์ภายในมหาวิทยาลัย

แนวคิดหลักคือ ภายในมหาวิทยาลัยมีอุปกรณ์อยู่ตามภาควิชา ห้อง Lab หรือหน่วยงานต่าง ๆ แต่ผู้ที่ต้องการใช้อุปกรณ์อาจไม่รู้ว่า:

- มีอุปกรณ์อะไรบ้าง
- อุปกรณ์อยู่ที่ไหน
- ใครเป็นผู้ดูแล
- สามารถยืมได้หรือไม่

UniWare จึงทำหน้าที่เป็นตัวกลางระหว่างผู้ใช้หลัก 2 ฝั่ง:

- **Provider** — ผู้ที่ดูแลหรือเป็นเจ้าของอุปกรณ์
- **Borrower** — ผู้ที่ต้องการค้นหาและยืมอุปกรณ์

Flow หลักของระบบ:

```text
สมัคร / Login
      ↓
Provider เพิ่ม Equipment
      ↓
Borrower ค้นหา Equipment
      ↓
ส่ง Borrow Request
      ↓
Provider Approve / Reject
      ↓
Checkout
      ↓
Return
```

---

# Sprint 1

## Sprint Goal

> ผู้ใช้สามารถเข้าสู่ระบบ และ Provider สามารถเพิ่มอุปกรณ์ให้ Borrower มองเห็นได้

Sprint 1 เน้นสร้าง Foundation ของระบบ:

```text
User
Authentication
Equipment
Catalog
```

User Stories ที่เลือกใน Sprint 1:

| Story | รายละเอียด |
|---|---|
| US1-1 | Register |
| US1-2 | Login |
| US1-3 | Logout |
| US2-1 | Provider adds Equipment |
| US2-2 | Provider views own Equipment |
| US2-3 | Provider edits Equipment |
| US2-5 | Category / Location / Status |
| US3-1 | Borrower views Equipment list |
| US3-4 | Equipment detail |

---

# Architecture

โครงสร้างระบบหลัก:

```text
Frontend
   │
   │ HTTP
   ▼
Backend API
   │
   ▼
Database
```

ตัวอย่าง Register:

```text
Register UI
   ↓
POST /api/auth/register
   ↓
Backend Validation
   ↓
Hash Password
   ↓
User Database
```

ตัวอย่าง Equipment:

```text
Add Equipment UI
   ↓
POST /api/equipment
   ↓
Authentication / Authorization
   ↓
Validation
   ↓
Equipment Database
```

---

# Tech Stack

## Frontend

| Technology | ใช้ทำอะไร |
|---|---|
| React | สร้าง UI แบบ Component |
| TypeScript | เพิ่ม Type Checking ให้ JavaScript |
| Vite | Development Server และ Build Tool |
| CSS | Styling สำหรับ Prototype |
| Vitest | Automated Testing |
| React Testing Library | ทดสอบ React Component จากมุมมองของ User |

Frontend ใช้:

```text
React + Vite + TypeScript
```

### React

React ใช้สร้าง UI จาก Component

ตัวอย่าง:

```tsx
function RegisterPage() {
  return <RegisterForm />;
}
```

แนวคิดคือ:

```text
Page
 ↓
Components
 ↓
UI Elements
```

เช่น:

```text
RegisterPage
    ↓
RegisterForm
    ├── Name
    ├── Email
    ├── Password
    └── Submit Button
```

### TypeScript

ไฟล์ TypeScript ปกติ:

```text
.ts
```

ตัวอย่าง:

```text
authApi.ts
validation.ts
```

ไฟล์ React ที่มี JSX:

```text
.tsx
```

ตัวอย่าง:

```text
RegisterPage.tsx
RegisterForm.tsx
```

### Vite

ใช้สำหรับ:

```text
Development Server
Hot Reload
Build Production
```

รัน Frontend:

```bash
npm run dev
```

---

# Project Structure

โครงสร้าง Frontend ที่ทีมควรใช้:

```text
frontend/
│
├── src/
│   │
│   ├── pages/
│   │
│   ├── components/
│   │
│   ├── services/
│   │
│   ├── types/
│   │
│   ├── utils/
│   │
│   ├── test/
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── .env.example
├── package.json
├── package-lock.json
└── vitest.config.ts
```

---

# แต่ละ Folder ใช้ทำอะไร

## `pages/`

เก็บหน้าหลักของระบบ

ตัวอย่าง:

```text
RegisterPage.tsx
LoginPage.tsx
EquipmentCatalogPage.tsx
EquipmentDetailPage.tsx
```

โดยทั่วไป 1 Page จะสอดคล้องกับ Screen หรือ Route หนึ่งของระบบ

---

## `components/`

เก็บ UI Component ที่ใช้ประกอบ Page

ตัวอย่าง:

```text
components/
├── auth/
│   ├── RegisterForm.tsx
│   └── LoginForm.tsx
│
└── equipment/
    └── EquipmentForm.tsx
```

ไม่ควรเขียน Feature ทั้งหมดรวมไว้ใน `App.tsx`

ควรเป็น:

```text
App
 ↓
Page
 ↓
Component
```

---

## `services/`

เก็บ Function สำหรับติดต่อ Backend API

ตัวอย่าง:

```text
services/
├── authApi.ts
└── equipmentApi.ts
```

ตัวอย่าง Flow:

```text
RegisterForm
     ↓
registerUser()
     ↓
authApi.ts
     ↓
Backend
```

ไม่ควรเขียน `fetch()` กระจายอยู่ใน Component หลายไฟล์

---

## `types/`

เก็บ Type / Interface ของ TypeScript

ตัวอย่าง:

```ts
interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}
```

ช่วยให้ Frontend ใช้รูปแบบข้อมูลเดียวกัน

---

## `utils/`

เก็บ Logic ที่ไม่ใช่ UI

ตัวอย่าง:

```text
validation.ts
```

เช่น:

```text
validateRegistration()
validateEquipment()
```

---

## CSS

`index.css`

ใช้สำหรับ Global Style เช่น:

```text
font
box-sizing
body
default element style
```

Style เฉพาะ Page ควรแยกไฟล์

ตัวอย่าง:

```text
RegisterPage.tsx
RegisterPage.css
```

ไม่ควรนำ CSS ของทุก Feature ไปกองรวมกันในไฟล์เดียว

---

# วิธีเริ่มใช้งาน Project

## 1. Clone Repository

```bash
git clone <repository-url>
```

เข้า Folder:

```bash
cd <repository-folder>
```

---

## 2. เข้า Frontend

```bash
cd frontend
```

---

## 3. Install Dependencies

```bash
npm install
```

ไม่ต้องส่ง `node_modules` ให้กัน

`npm install` จะอ่าน:

```text
package.json
package-lock.json
```

แล้วติดตั้ง Dependency ที่ Project ต้องการให้เอง

ดังนั้น:

```text
package.json       ✅ commit
package-lock.json  ✅ commit
node_modules       ❌ ห้าม commit
```

---

# Environment Variables

หลัง Clone Project ให้สร้าง:

```text
frontend/.env
```

โดยดูตัวอย่างจาก:

```text
frontend/.env.example
```

ตัวอย่าง:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USE_MOCK_API=true
```

ระหว่างที่ Backend ยังไม่พร้อม:

```env
VITE_USE_MOCK_API=true
```

เมื่อ Backend พร้อม:

```env
VITE_USE_MOCK_API=false
```

หลังแก้ `.env` ควร Restart Vite:

```bash
Ctrl + C
npm run dev
```

> ห้ามเก็บ Password, Database Password, Secret Key หรือข้อมูลลับในตัวแปร `VITE_`
>
> เพราะ Environment Variable ฝั่ง Frontend สามารถถูกเปิดเผยใน Browser ได้

---

# การรัน Frontend

Development:

```bash
npm run dev
```

โดยปกติ Vite จะเปิดที่:

```text
http://localhost:5173
```

---

# การ Test

รัน Test แบบ Watch Mode:

```bash
npm test
```

รัน Test ครั้งเดียว:

```bash
npm run test:run
```

---

# Lint

ตรวจ Code Quality:

```bash
npm run lint
```

---

# Build

ตรวจว่า Project สามารถ Build เป็น Production ได้หรือไม่:

```bash
npm run build
```

---

# ก่อนส่ง Pull Request

Frontend ทุกคนควรรัน:

```bash
npm run test:run
npm run lint
npm run build
```

ทั้ง 3 คำสั่งควรผ่านก่อนขอ Merge

---

# Git Workflow

## ห้ามทำงานตรง `main`

ก่อนเริ่ม User Story ใหม่:

```bash
git switch main
git pull
```

จากนั้นสร้าง Branch:

```bash
git switch -c feature/usX-X-name
```

ตัวอย่าง:

```text
feature/us1-1-register
feature/us1-2-login
feature/us1-3-logout

feature/us2-1-add-equipment
feature/us2-2-my-equipment
feature/us2-3-edit-equipment

feature/us3-1-catalog
feature/us3-4-equipment-detail
```

---

# ขั้นตอนการทำงานด้วย Git

```text
main ล่าสุด
    ↓
สร้าง Feature Branch
    ↓
เขียน Code
    ↓
Commit
    ↓
Push
    ↓
Pull Request
    ↓
Code Review
    ↓
Merge เข้า main
```

ตัวอย่าง:

```bash
git switch main

git pull

git switch -c feature/us2-1-add-equipment
```

ทำงานเสร็จบางส่วน:

```bash
git add .
git commit -m "feat(us2-1): add equipment form"
```

Push:

```bash
git push -u origin feature/us2-1-add-equipment
```

จากนั้นเปิด Pull Request:

```text
feature/us2-1-add-equipment
              ↓
             main
```

---

# Push ไม่เท่ากับ Merge

สามารถ Push งานที่ยังไม่เสร็จขึ้น GitHub ได้

```text
Commit
 ↓
Push
```

ไม่ได้ทำให้ `main` เปลี่ยน

`main` จะเปลี่ยนก็ต่อเมื่อ:

```text
Pull Request
 ↓
Review
 ↓
Merge
```

ดังนั้นควร Push งานเป็นระยะเพื่อ:

- Backup งาน
- ให้เพื่อนดู Progress
- ให้เพื่อน Review ได้
- ลดความเสี่ยงงานหาย

---

# Commit Message Convention

Feature:

```text
feat(us1-1): add registration form
```

Test:

```text
test(us1-1): add registration tests
```

Style:

```text
style(us1-1): add registration prototype styling
```

Documentation:

```text
docs: add API contract
```

Setup / Configuration:

```text
chore: initialize frontend
```

---

# API Convention

รายละเอียด API กลางอยู่ที่:

```text
docs/api-contract.md
```

Frontend และ Backend ต้องตกลง Request / Response Format ให้ตรงกันก่อนทำ Integration

ตัวอย่าง Register:

```http
POST /api/auth/register
```

Request:

```json
{
  "name": "Putter",
  "email": "6731234521@student.chula.ac.th",
  "password": "Uniware123"
}
```

ตัวอย่าง Success:

```http
201 Created
```

```json
{
  "message": "Registration successful",
  "user": {
    "id": "1",
    "name": "Putter",
    "email": "6731234521@student.chula.ac.th",
    "role": "BORROWER"
  }
}
```

Error Format กลาง:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

ตัวอย่าง:

```json
{
  "code": "EMAIL_ALREADY_EXISTS",
  "message": "An account with this email already exists."
}
```

---

# Frontend / Backend Responsibility

Frontend รับผิดชอบ:

```text
UI
Form State
Client-side Validation
Loading State
Error / Success Display
API Request
```

Backend รับผิดชอบ:

```text
Server-side Validation
Authentication
Authorization
Database
Password Hashing
Business Rules
```

สำคัญ:

```text
Frontend Validation
≠
Security
```

Frontend Validation ช่วย User Experience

แต่ Backend ต้อง Validate ซ้ำเสมอ เพราะ Frontend สามารถถูก Bypass ได้

---

# Definition of Done

User Story จะถือว่า Done เมื่อ:

- UI ที่เกี่ยวข้องทำงาน
- API ที่เกี่ยวข้องทำงาน
- Data Model ที่เกี่ยวข้องพร้อม
- Valid Acceptance Criteria ผ่าน
- Invalid Acceptance Criteria ผ่าน
- Validation ทำงาน
- Permission / Authorization ทำงานถ้ามี
- Test ผ่าน
- Code ถูก Review
- Merge เข้า `main`
- ไม่มี Critical Defect ที่ทำให้ Flow หลักใช้ไม่ได้

---

# ถ้าจะเริ่มทำ Frontend Story ใหม่

ตัวอย่าง US1-2 Login

## 1. Update main

```bash
git switch main
git pull
```

## 2. สร้าง Branch

```bash
git switch -c feature/us1-2-login
```

## 3. ดู Structure เดิมก่อนสร้างไฟล์ใหม่

Authentication มี:

```text
services/authApi.ts
types/auth.ts
components/auth/
```

ดังนั้น Login ควรต่อยอดของเดิม

ตัวอย่าง:

```text
pages/
└── LoginPage.tsx

components/
└── auth/
    └── LoginForm.tsx

services/
└── authApi.ts

types/
└── auth.ts
```

อย่าสร้าง Service ซ้ำโดยไม่จำเป็น เช่น:

```text
loginApi.ts
userAuthApi.ts
authenticationApi.ts
```

ถ้ามี `authApi.ts` อยู่แล้ว ให้เพิ่ม:

```text
registerUser()
loginUser()
logoutUser()
```

ไว้ด้วยกัน

---

# ถ้าจะทำ Equipment

ใช้ Pattern เดียวกัน:

```text
pages/
└── AddEquipmentPage.tsx

components/
└── equipment/
    └── EquipmentForm.tsx

services/
└── equipmentApi.ts

types/
└── equipment.ts

utils/
└── equipmentValidation.ts
```

Flow:

```text
Page
 ↓
Component
 ↓
Validation
 ↓
Service
 ↓
Backend API
```

---

# กติกากลางของทีม

1. ไม่เขียนงานตรง `main`
2. ก่อนสร้าง Branch ใหม่ต้อง `git pull` main ล่าสุด
3. 1 User Story / Feature ต่อ 1 Branch เป็นหลัก
4. Push งานขึ้น GitHub เป็นระยะ
5. Merge ผ่าน Pull Request
6. ให้เพื่อน Review ก่อน Merge
7. ไม่ Commit `node_modules`
8. ไม่ Commit `.env`
9. API Call ให้อยู่ใน `services/`
10. TypeScript Type กลางให้อยู่ใน `types/`
11. Validation ที่นำกลับมาใช้ได้ให้อยู่ใน `utils/`
12. CSS เฉพาะ Page ไม่ควรใส่ใน `index.css`
13. ก่อน Merge Frontend ต้องผ่าน:

```bash
npm run test:run
npm run lint
npm run build
```

14. หากจะเปลี่ยน API Contract หรือ Project Structure ที่คนอื่นใช้ร่วมกัน ให้คุยกับทีมก่อน

---

# สิ่งที่ควรอ่านก่อนเริ่มทำงาน

สำหรับสมาชิกทีมใหม่หรือคนที่กำลังเริ่ม User Story:

1. อ่าน README นี้
2. Pull `main` ล่าสุด
3. ดู Sprint Backlog / User Story ของตัวเอง
4. ดู Acceptance Criteria
5. ดู Folder Structure ที่มีอยู่แล้ว
6. ดู `docs/api-contract.md`
7. สร้าง Feature Branch
8. เริ่ม Implementation
9. Test
10. เปิด Pull Request