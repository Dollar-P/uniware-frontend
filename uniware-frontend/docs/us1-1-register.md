> Historical implementation notes: the registration frontend now follows the current Django backend. See [API contract](api-contract.md) for current fields, validation rules, response shapes, and setup. The single-name, student-ID-only, 8-character password, and mock-default examples below describe the earlier prototype.

# US1-1 — Register Account

เอกสารนี้อธิบายรายละเอียดการพัฒนา **US1-1 Register Account** ของ UniWare ใน Sprint 1

เนื้อหาครอบคลุม:

- User Story และ Acceptance Criteria
- Frontend Architecture
- Validation Rules
- API Contract
- Mock API
- Automated Tests
- สิ่งที่ Frontend ทำเสร็จแล้ว
- สิ่งที่ Backend ยังต้องทำ
- ขั้นตอน Integration เมื่อ Backend พร้อม

---

# 1. User Story

## US1-1 — Register Account

ผู้ใช้ใหม่ต้องสามารถสมัครบัญชี UniWare ด้วยอีเมลมหาวิทยาลัยที่ได้รับอนุญาต เพื่อเข้าใช้งานระบบ

ข้อมูลหลักที่ใช้สมัคร:

```text
Name
University Email
Password
```

---

# 2. Acceptance Criteria

## Valid Registration

เมื่อ:

```text
Name ถูกต้อง
University Email ถูกต้อง
Password ผ่านเงื่อนไข
```

และผู้ใช้กด:

```text
Create Account
```

ระบบต้อง:

```text
Validate ข้อมูล
↓
สร้าง Account
↓
บันทึก User
↓
แจ้ง Registration successful
```

---

## Invalid Registration

ระบบต้อง Reject การสมัครเมื่อเกิดกรณี เช่น:

```text
Name ว่าง
University Email ไม่ถูกต้อง
Password ไม่ผ่านเงื่อนไข
Email ถูกใช้งานแล้ว
```

และต้องแสดง Error Message ให้ User เข้าใจได้

---

# 3. US1-1 Tasks

Sprint Backlog แบ่ง US1-1 ออกเป็น 8 Tasks:

```text
Task 1
Design & implement Registration Form UI

Task 2
Client-side required-field and email validation

Task 3
Create User data model and database migration

Task 4
Implement Register API

Task 5
Server-side university-email and duplicate-email validation

Task 6
Hash password before storing

Task 7
Connect Registration UI to API

Task 8
Test valid and invalid registration cases
```

---

# 4. Current Architecture

US1-1 ใช้ Flow:

```text
RegisterPage
      ↓
RegisterForm
      ↓
Client Validation
      ↓
authApi.registerUser()
      ↓
Mock API / Real API
      ↓
Backend
      ↓
Validation
      ↓
Password Hash
      ↓
User Database
```

Frontend และ Backend แยก Responsibility กันอย่างชัดเจน

---

# 5. Frontend Structure

ไฟล์หลักที่เกี่ยวข้องกับ US1-1:

```text
frontend/
│
├── src/
│   │
│   ├── pages/
│   │   ├── RegisterPage.tsx
│   │   └── RegisterPage.css
│   │
│   ├── components/
│   │   └── auth/
│   │       ├── RegisterForm.tsx
│   │       └── RegisterForm.test.tsx
│   │
│   ├── services/
│   │   └── authApi.ts
│   │
│   ├── types/
│   │   └── auth.ts
│   │
│   ├── utils/
│   │   ├── validation.ts
│   │   └── validation.test.ts
│   │
│   └── test/
│       └── setup.ts
│
├── .env.example
└── vitest.config.ts
```

---

# 6. Responsibility ของแต่ละไฟล์

## `RegisterPage.tsx`

รับผิดชอบหน้า Register

ตัวอย่าง Component Tree:

```text
RegisterPage
      ↓
RegisterForm
```

Page ไม่ควรเก็บ Business Logic จำนวนมาก

---

## `RegisterForm.tsx`

รับผิดชอบ:

```text
Form UI
React State
User Input
Submit Event
Loading State
Success Message
API Error Message
```

Form เก็บ State หลัก:

```text
name
email
password

errors

isLoading
successMessage
apiError
```

---

## `validation.ts`

รับผิดชอบ Client-side Validation

แยกออกจาก React Component เพื่อไม่ให้:

```text
RegisterForm.tsx
```

มีทั้ง UI + Validation + API Logic รวมอยู่ในไฟล์เดียว

---

## `authApi.ts`

รับผิดชอบการติดต่อ Authentication API

เช่น:

```text
registerUser()
```

Component ไม่ต้องรู้รายละเอียดว่า:

```text
ใช้ Mock API
หรือ
ใช้ Backend จริง
```

Component เรียกเพียง:

```text
registerUser(data)
```

---

## `auth.ts`

เก็บ TypeScript Types / Interfaces ที่เกี่ยวข้องกับ Authentication

ตัวอย่าง:

```text
RegisterFormData
RegisterFormErrors
RegisterRequest
RegisterResponse
ApiError
```

---

# 7. Registration Validation Rules

กฎต่อไปนี้เป็น Project Rules ที่ทีมกำหนดเพิ่มเติมระหว่าง Implementation

## Name

Name ต้องไม่เป็นค่าว่าง

Invalid:

```text
""
"     "
```

---

# 8. Chulalongkorn Student Email

รูปแบบ Email:

```text
XXXXXXXXXX@student.chula.ac.th
```

โดย:

```text
XXXXXXXXXX
```

ต้องเป็นตัวเลขจำนวน **10 หลักพอดี**

Valid:

```text
6731234521@student.chula.ac.th
```

Invalid:

```text
putter@student.chula.ac.th

123456789@student.chula.ac.th

12345678901@student.chula.ac.th

1234567890@gmail.com
```

Frontend Validation Pattern:

```text
^\d{10}@student\.chula\.ac\.th$
```

หมายเหตุ:

Frontend Validation ใช้เพื่อช่วย User Experience

Backend ต้อง Validate Rule นี้ซ้ำอีกครั้ง เพราะ Frontend สามารถถูก Bypass ได้

---

# 9. Password Policy

Password ต้อง:

```text
มีอย่างน้อย 8 Characters

มี Lowercase อย่างน้อย 1 ตัว

มี Uppercase อย่างน้อย 1 ตัว

มี Number อย่างน้อย 1 ตัว
```

Valid:

```text
Uniware123
Password1
Hello123
```

Invalid:

```text
password
PASSWORD1
Password
Pass1
```

Backend ต้อง Validate Rule เดียวกันอีกครั้ง

---

# 10. Frontend Validation Flow

```text
User กด Create Account
        ↓
handleSubmit()
        ↓
validateRegistration()
        ↓
มี Error?
   ┌────┴────┐
  Yes       No
   ↓         ↓
แสดง Error   registerUser()
Return
```

ถ้า Client Validation ไม่ผ่าน:

```text
API จะไม่ถูกเรียก
```

---

# 11. Register API Contract

รายละเอียดกลางของ API อยู่ที่:

```text
docs/api-contract.md
```

สำหรับ US1-1 ใช้:

```http
POST /api/auth/register
```

---

# 12. Request Format

```json
{
  "name": "Putter",
  "email": "6731234521@student.chula.ac.th",
  "password": "Uniware123"
}
```

Frontend ต้องไม่ส่ง Role ใน Registration Request

ตัวอย่างที่ไม่ควรทำ:

```json
{
  "name": "Putter",
  "email": "6731234521@student.chula.ac.th",
  "password": "Uniware123",
  "role": "PROVIDER"
}
```

Role ต้องถูกควบคุมโดย Backend

สำหรับ Sprint 1:

```text
Self Registration
→ BORROWER
```

Provider สามารถใช้ Seed/Test Account ที่ทีมเตรียมไว้ก่อน

---

# 13. Successful Response

Backend ควรตอบ:

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

---

# 14. Error Format

UniWare ใช้ Error Format กลาง:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

Frontend จะแสดง:

```text
message
```

ให้ User

ส่วน:

```text
code
```

สามารถใช้สำหรับ Logic เพิ่มเติมในอนาคต

---

# 15. Duplicate Email

เมื่อ Email ถูกใช้งานแล้ว:

```http
409 Conflict
```

Response:

```json
{
  "code": "EMAIL_ALREADY_EXISTS",
  "message": "An account with this email already exists."
}
```

---

# 16. Validation Error

เมื่อข้อมูลไม่ถูกต้อง:

```http
400 Bad Request
```

ตัวอย่าง Response:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Invalid registration data."
}
```

---

# 17. Mock API

ในช่วงที่ Backend ยังไม่พร้อม Frontend สามารถทำงานผ่าน Mock API ได้

Environment:

```env
VITE_USE_MOCK_API=true
```

Flow:

```text
RegisterForm
     ↓
registerUser()
     ↓
Mock Register
     ↓
Mock Response
```

Mock ใช้เพื่อให้ Frontend สามารถพัฒนา:

```text
Loading
Success
Error
Validation
```

ได้โดยไม่ต้องรอ Backend

---

# 18. Mock Duplicate Email

สำหรับการทดสอบ Prototype ปัจจุบัน สามารถใช้:

```text
1111111111@student.chula.ac.th
```

เพื่อจำลอง:

```text
Email Already Exists
```

Mock API จะ Return Error:

```text
An account with this email already exists.
```

หมายเหตุ:

Email นี้เป็นเพียง Mock Test Data

ไม่ใช่ Business Rule ของระบบจริง

เมื่อ Backend พร้อม Logic นี้จะถูกแทนด้วยการตรวจ Database จริง

---

# 19. Real Backend Mode

เมื่อ Register Backend พร้อม:

เปลี่ยน:

```env
VITE_USE_MOCK_API=true
```

เป็น:

```env
VITE_USE_MOCK_API=false
```

Frontend จะใช้:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

และส่ง Request ไป:

```text
POST http://localhost:3000/api/auth/register
```

หลังเปลี่ยน `.env` ให้ Restart Vite:

```bash
Ctrl + C
npm run dev
```

---

# 20. Registration UI States

Frontend รองรับ State หลักดังนี้

## Normal

```text
Name
Email
Password

Create Account
```

---

## Validation Error

ตัวอย่าง:

```text
Email must be a 10-digit student ID followed by @student.chula.ac.th
```

---

## Loading

ขณะรอ API:

```text
Creating account...
```

Button ถูก Disable เพื่อป้องกันการ Submit ซ้ำหลายครั้ง

---

## Success

```text
Registration successful
```

หลัง Success:

```text
Name
Email
Password
```

จะถูก Reset

---

## API Error

ตัวอย่าง:

```text
An account with this email already exists.
```

กรณี API Error ค่าใน Form จะยังอยู่ เพื่อให้ User แก้ข้อมูลและ Submit ใหม่ได้

---

# 21. Automated Tests

US1-1 Frontend มี Automated Test อยู่ 2 ระดับ

```text
Validation Unit Tests

Register Form Component Tests
```

---

# 22. Validation Tests

ไฟล์:

```text
src/utils/validation.test.ts
```

ทดสอบกรณี:

```text
Valid registration data

Missing name

Non-Chula email

Student ID ไม่ครบ 10 หลัก

Weak password

Missing password
```

---

# 23. Register Form Tests

ไฟล์:

```text
src/components/auth/RegisterForm.test.tsx
```

ทดสอบ Behavior จากมุมมอง User

เช่น:

```text
User กรอกข้อมูล
↓
กด Create Account
↓
API ถูกเรียก
↓
แสดง Registration successful
```

รวมถึง:

```text
Duplicate Email
↓
API Reject
↓
Frontend แสดง Error
```

และ:

```text
Invalid Form
↓
Frontend Validation Reject
↓
API ต้องไม่ถูกเรียก
```

---

# 24. วิธีรัน Tests

Watch Mode:

```bash
npm test
```

Run ครั้งเดียว:

```bash
npm run test:run
```

---

# 25. Final Frontend Checks

ก่อน Frontend PR พร้อม Merge ต้องผ่าน:

```bash
npm run test:run
npm run lint
npm run build
```

ความหมาย:

```text
test
→ Behavior ทำงานถูกต้องหรือไม่

lint
→ Code มีปัญหาด้าน Coding Standard หรือไม่

build
→ Project Compile สำหรับ Production ได้หรือไม่
```

US1-1 Frontend ปัจจุบันผ่านทั้ง 3 ขั้นตอนแล้ว

---

# 26. Frontend Status

Frontend US1-1 ปัจจุบัน:

```text
Registration Page                 ✅

Registration Form                 ✅

React Form State                  ✅

Required Field Validation         ✅

Chula Student Email Validation    ✅

Password Validation               ✅

Loading State                     ✅

Success State                     ✅

API Error State                   ✅

TypeScript API Types              ✅

API Contract                      ✅

Mock API                          ✅

Real API-ready Fetch              ✅

Environment Configuration         ✅

Prototype Styling                 ✅

Validation Tests                  ✅

Register Form Tests               ✅

Lint                              ✅

Production Build                  ✅
```

ดังนั้น:

```text
US1-1 Frontend Portion
→ Ready
```

---

# 27. Backend Work Remaining

US1-1 ยังไม่ถือว่า Done ทั้ง User Story

Backend ยังต้องทำ:

```text
User Data Model

Database Migration

POST /api/auth/register

Server-side Name Validation

Server-side Chula Email Validation

Server-side Password Validation

Duplicate Email Validation

Password Hashing

Create User in Database

Return Correct API Response
```

---

# 28. User Data Model

แนวคิด User Model จาก Sprint:

```text
User
----------------
id
name
email
password_hash
role
status
```

Backend ต้องเก็บ:

```text
password_hash
```

ไม่ใช่:

```text
password
```

ห้ามเก็บ Plain-text Password ลง Database

---

# 29. Backend Registration Flow

Backend ที่ต้อง Implement:

```text
POST /api/auth/register
        ↓
Receive
name
email
password
        ↓
Validate Input
        ↓
Validate Chula Email
        ↓
Validate Password
        ↓
Check Duplicate Email
        ↓
Hash Password
        ↓
Create User
        ↓
Save Database
        ↓
201 Created
```

---

# 30. Frontend / Backend Responsibility

## Frontend

รับผิดชอบ:

```text
Registration UI

Form State

Client Validation

Loading

Success/Error Message

API Request

User Experience
```

## Backend

รับผิดชอบ:

```text
Server Validation

Duplicate Email Check

Password Hashing

Database

Role Assignment

Security
```

---

# 31. Client Validation ≠ Security

ถึง Frontend จะ Validate:

```text
Email
Password
Name
```

Backend ต้อง Validate ซ้ำทั้งหมด

เหตุผลคือ User สามารถข้าม React UI แล้วเรียก API โดยตรงได้

ตัวอย่าง:

```text
POST /api/auth/register
```

ดังนั้น:

```text
Frontend Validation
→ User Experience

Backend Validation
→ Security + Data Integrity
```

---

# 32. Integration เมื่อ Backend พร้อม

เมื่อ Backend US1-1 พร้อม:

## Step 1

รัน Backend

ตัวอย่าง:

```text
http://localhost:3000
```

## Step 2

ตั้ง Frontend:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USE_MOCK_API=false
```

## Step 3

Restart Frontend:

```bash
npm run dev
```

## Step 4

ทดสอบ Flow จริง:

```text
Frontend
↓
POST /api/auth/register
↓
Backend
↓
Database
↓
Response
↓
Frontend
```

---

# 33. Integration Test Cases

หลัง Backend พร้อม ต้องทดสอบอย่างน้อย:

```text
Valid Registration

Missing Name

Invalid Email Domain

Student ID ไม่ครบ 10 หลัก

Weak Password

Duplicate Email
```

Valid Case ต้อง:

```text
Account Created
+
User ถูกบันทึกใน Database
+
Password ถูก Hash
+
Frontend แสดง Registration successful
```

Invalid Case ต้อง:

```text
Reject
+
ไม่สร้าง User
+
Frontend แสดง Error
```

---

# 34. Definition of Done

US1-1 จะถือว่า Done เมื่อ:

```text
Frontend UI ทำงาน

Backend API ทำงาน

User Data Model / Database ทำงาน

Client Validation ทำงาน

Server Validation ทำงาน

Duplicate Email ถูก Reject

Password ถูก Hash

Valid Registration ผ่าน

Invalid Registration ผ่าน

Frontend ↔ Backend Integration ผ่าน

Automated Tests ผ่าน

Code ถูก Review

Merge เข้า main

ไม่มี Critical Defect
```

ดังนั้นปัจจุบัน:

```text
Frontend Portion
✅ Ready

Whole US1-1 Story
⏳ In Progress
```

จนกว่า Backend และ Integration จะเสร็จ

---

# 35. Branch

Frontend US1-1 ถูกพัฒนาใน:

```text
feature/us1-1-register
```

Workflow:

```text
main
 ↓
feature/us1-1-register
 ↓
Development
 ↓
Tests
 ↓
Push
 ↓
Pull Request
 ↓
Review
 ↓
Merge main
```

---

# 36. สำหรับผู้ทำ Backend US1-1

ก่อนเริ่ม Backend กรุณาอ่าน:

```text
docs/api-contract.md
docs/us1-1-register.md
```

Backend ควร Implement ตาม Contract เดียวกับ Frontend เพื่อไม่ให้ Integration ต้องกลับมาแก้ทั้งสองฝั่ง

สิ่งสำคัญที่ต้องตรงกัน:

```text
Endpoint

Request Fields

Response Format

HTTP Status Code

Error Format

Email Rule

Password Rule

Role Assignment
```

หากต้องการเปลี่ยน Contract ให้คุยกับ Frontend ก่อนเปลี่ยน Implementation

---

# 37. Summary

สถานะปัจจุบัน:

```text
Register UI
      ✅

Client Validation
      ✅

API-ready Frontend
      ✅

Mock API
      ✅

Frontend Automated Tests
      ✅

Backend
      ⏳

Database
      ⏳

Password Hash
      ⏳

Real Integration
      ⏳
```

เป้าหมายสุดท้าย:

```text
User
 ↓
Register Form
 ↓
Frontend Validation
 ↓
POST /api/auth/register
 ↓
Backend Validation
 ↓
Password Hash
 ↓
User Database
 ↓
201 Created
 ↓
Registration successful
```
