# Student Academic Record Management System (SAM)

Tech stack:
- Frontend: React + Vite + Bootstrap
- Backend: Node.js + Express.js
- Database: MySQL (XAMPP)

## Quick start (new user)

### 1) Start MySQL (XAMPP)

1. Open XAMPP Control Panel
2. Start MySQL  
   (Apache is only needed if you want to use phpMyAdmin.)

### 2) Create database + sample data

Run these SQL files in MySQL:
1. `backend/sql/create_tables.sql` (creates DB + tables)
2. `backend/sql/sample_data.sql` (adds sample departments/subjects + sample teachers)

Example (MySQL CLI):
```sql
SOURCE backend/sql/create_tables.sql;
SOURCE backend/sql/sample_data.sql;
```

### 3) Backend (API) - start `server.js`

```powershell
cd backend
Copy-Item .env.example .env
npm install
node server.js
```

Backend default: `http://localhost:3000`

### 4) Frontend (Vite) - run dev server

```powershell
cd frontend
npm install
npm run dev
```

- Vite uses `src/main.jsx` as the entry.
- When the dev server starts, press `o` in the terminal or open the printed URL (usually `http://localhost:5173`).
- The frontend dev server proxies `/api` to the backend (see `frontend/vite.config.js`).

## Login (Admin / Teachers / Homeroom Teacher)

Open the app and go to:
- `http://localhost:5173/#/login`

After login, the app redirects based on role:
- Admin -> Dashboard
- Subject Teacher -> Marks
- Homeroom Teacher -> Reports

### Default accounts

Admin (created automatically on first backend start if `admins` table is empty):
- Username: `admin`
- Password: `admin123`

Teachers (only if you ran `backend/sql/sample_data.sql`):
- Password for all sample teachers: `teacher123`
- Subject teachers: `genet`, `alemu`, `tola`, `olyad`, `alemayehu`
- Homeroom teacher (class `9A`): `addisu`

If you did not run the sample data, log in as Admin and create teacher accounts in the Teachers page.

### Page access (what each user can open)

- Admin: Students, Subjects, Teachers
- Subject Teacher: Marks
- Homeroom Teacher: Reports

## API (summary)

All API endpoints are under `/api` (most require login session).
- Auth: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Students: `GET/POST /api/students`, `PUT/DELETE /api/students/:id`
- Subjects: `GET/POST /api/subjects`, `PUT/DELETE /api/subjects/:id`
- Teachers: `GET/POST /api/teachers`, `PUT/DELETE /api/teachers/:id`
- Departments: `GET /api/departments`
- Marks: `GET/POST /api/marks`, `POST /api/marks/bulk`, `PUT/DELETE /api/marks/:id`
- Reports: `GET /api/reports`, `GET /api/reports/:studentId`
