# EmployeeHub

An employee management dashboard. Add, view, edit, search and delete employees. All data is stored in PostgreSQL.

- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Architecture](#architecture)
- [End-to-end data flow](#end-to-end-data-flow)
- [Project structure](#project-structure)
- [API reference](#api-reference)
- [Database](#database)
- [Validation and error handling](#validation-and-error-handling)
- [Debugging and testing the API](#debugging-and-testing-the-api)
- [Conventions and gotchas](#conventions-and-gotchas)
- [Troubleshooting](#troubleshooting)

---

## Features

| Area | What it does |
|---|---|
| Dashboard (`/dashboard`) | Four stat cards (total employees, departments, new this month, recently added) and a table of the 5 newest employees |
| Employees (`/employees`) | Full list with search (name or email), department filter, pagination, and a row menu with View / Edit / Delete |
| Add employee | **Popup** (modal) opened by the "Add Employee" button. No separate page |
| Employee details (`/employees/[id]`) | All fields for one employee, with Edit and Delete buttons |
| Edit employee (`/employees/[id]/edit`) | The form pre-filled with the current values |
| Delete | Confirmation popup, then a success message. Errors are shown inside the popup |
| Layout | Fixed sidebar on desktop (1024px and wider). On smaller screens, a top bar with a menu button opens a slide-in drawer |

Salary is stored and shown in Indian rupees (INR), for example `₹12,50,000`. Nothing is converted. The number you type is the number saved.

## Tech stack

- **Next.js 16** (App Router, Turbopack, Cache Components) and **React 19**
- **TypeScript**
- **Tailwind CSS 4** and **Lucide** icons, with the **Manrope** font
- **PostgreSQL** through the plain `pg` driver. No ORM
- **pnpm** as the package manager

> This is a recent Next.js version with changes from older ones. Before changing framework-level code, read the matching guide in `node_modules/next/dist/docs/` (see `AGENTS.md`).

## Quick start

Requirements: Node.js 20+, pnpm, and a running PostgreSQL server.

```bash
pnpm install
```

1. **Create `.env`.** Copy `.env.example` to `.env` and put your PostgreSQL password in the URL:
   ```
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/employeehub"
   ```
   Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`. If the password has special characters (`@ : / # ?`), URL-encode them (for example `@` becomes `%40`). `.env` is git-ignored and only read on the server.
2. **Create the database and table.**
   ```bash
   pnpm db:init
   ```
   It creates the `employeehub` database if it does not exist, then the `employees` table. It is safe to run again.
3. **Start the app.**
   ```bash
   pnpm dev        # http://localhost:3000
   ```

| Command | Purpose |
|---|---|
| `pnpm dev` | Development server with hot reload |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm lint` | ESLint |
| `pnpm db:init` | Create the database and table |

The app starts empty. Add employees from the UI.

---

## Architecture

The code is split into three layers. Each layer only talks to the one next to it.

```
┌─────────────────────────────── BROWSER ───────────────────────────────┐
│                                                                       │
│  Pages (server components)      app/**/page.tsx                       │
│        │  compose                                                     │
│        ▼                                                              │
│  Components (client)            components/**                         │
│        │  call hooks                                                  │
│        ▼                                                              │
│  Hooks                          lib/hooks/*                           │
│        │  call                                                        │
│        ▼                                                              │
│  API client                     lib/api-client.ts   ── fetch() ──┐    │
└───────────────────────────────────────────────────────────────── │ ───┘
                                                                    │ HTTP + JSON
┌─────────────────────────────── SERVER ────────────────────────────▼───┐
│                                                                       │
│  Route handlers                 app/api/**/route.ts                   │
│        │  validate input        lib/validations/employee-schema.ts    │
│        │  log + catch errors    handleErrors() in lib/utils.ts        │
│        ▼                                                              │
│  Service (all SQL)              lib/employee-service.ts               │
│        ▼                                                              │
│  Connection pool                lib/db.ts  ── pg ──┐                  │
└──────────────────────────────────────────────────── │ ────────────────┘
                                                      ▼
                                          PostgreSQL  (table: employees)
```

Rules that keep it easy to debug:

- **Components never call `fetch()` directly.** Every request is a function in `lib/api-client.ts`.
- **The browser never touches the database.** Only route handlers import `lib/employee-service.ts`, and only that file imports `lib/db.ts`. Because `.env` is read on the server only, the database password never reaches the browser.
- **Every SQL query is in one file** (`lib/employee-service.ts`) and uses `$1, $2...` placeholders, so user input is never pasted into SQL text (this prevents SQL injection).
- **Validation is shared.** The same function checks input in the browser form and again in the API.

### How pages are built

- Pages in `app/` are **server components** that only compose pieces. The interactive parts (table, form, popups) are **client components** (`"use client"`).
- The employees page reads `?search=` and `?department=` from the URL. The details and edit pages read the `[id]` from the URL. Both are read inside `<Suspense>`, which Cache Components requires.
- `/` redirects to `/dashboard` (set in `next.config.ts`).

---

## End-to-end data flow

### 1. Loading the employee list (read)

```
User opens /employees
  1. Server renders the page shell (PageHeader + <Suspense>)
  2. Browser hydrates <EmployeeDirectory>
  3. useEmployees({search, department, page, pageSize, sort})      lib/hooks/use-employees.ts
  4. useAsyncData runs fetchEmployees(query)                       lib/hooks/use-async-data.ts
  5. fetch GET /api/employees?page=1&pageSize=10&sort=recent       lib/api-client.ts
  6. Route handler GET                                             app/api/employees/route.ts
       └─ handleErrors: logs the request, catches failures
  7. listEmployees(query)                                          lib/employee-service.ts
       └─ SELECT count(*) ...  then  SELECT ... ORDER BY ... LIMIT ... OFFSET ...
  8. Rows come back, snake_case columns are renamed to camelCase
  9. JSON { data, total, page, pageSize, totalPages }
 10. useAsyncData stores it, <EmployeeTable> renders the rows
```

While a new request is in flight (typing in search, changing page) the previous rows stay visible and fade slightly, so the table does not flicker. Search is debounced by 300 ms so a request is not sent on every keystroke.

### 2. Adding an employee (create)

```
User clicks "Add Employee"
  1. <AddEmployeeButton> opens a <Modal> containing <EmployeeForm>   components/employees/employee-directory.tsx
  2. User fills the form and clicks "Save Employee"
  3. validateEmployeeInput(values) runs in the browser              lib/validations/employee-schema.ts
       ├─ invalid -> field errors are shown, first bad field is focused, NOTHING is sent
       └─ valid   -> continue
  4. createEmployee(input)  ->  fetch POST /api/employees           lib/api-client.ts
  5. Route handler POST                                             app/api/employees/route.ts
       ├─ validateEmployeeInput(body) AGAIN (server never trusts the browser)  -> 400 on failure
       └─ createEmployee(value)                                     lib/employee-service.ts
            └─ INSERT INTO employees (...) VALUES ($1..$6) RETURNING ...
               email already exists? PostgreSQL error 23505 -> DuplicateEmailError -> 409
  6. 201 { data: employee }
  7. createEmployee() in the client calls invalidateData()          lib/api-client.ts
  8. Every list on screen (dashboard stats, recent employees, directory) refetches by itself
  9. The form shows a success message and the popup closes
```

### 3. Editing an employee (update)

```
User clicks Edit  ->  /employees/[id]/edit
  1. <EditEmployee id> loads the employee: GET /api/employees/[id]
  2. <EmployeeForm employee={...}> is pre-filled
  3. Save -> validate in browser -> PATCH /api/employees/[id]
  4. Route handler: loads the current row (404 if missing), merges the changes onto it,
     validates the merged result, then UPDATE ... SET ..., updated_at = now() WHERE id = $1
  5. invalidateData() refreshes everything, user returns to /employees/[id]
```

### 4. Deleting an employee

```
User clicks Delete (row menu or details page)
  1. useDeleteEmployee().requestDelete(employee) opens <DeleteEmployeeDialog>
  2. Confirm -> DELETE /api/employees/[id]  -> DELETE FROM employees WHERE id = $1
  3. Success: success message, invalidateData() refreshes all lists
     (on the details page the user is sent back to /employees)
  4. Failure (for example already deleted): the error is shown inside the dialog and you can retry
```

### 5. Dashboard statistics

`GET /api/dashboard/stats` runs one SQL query with three counts:

| Card | How it is calculated |
|---|---|
| Total Employees | `count(*)` |
| Departments | Size of the fixed department list (8) |
| New Employees This Month | Employees whose `joining_date` is in the current month |
| Recently Added Employees | Employees whose `created_at` is in the last 7 days |

### Keeping the screen in sync

`invalidateData()` (in `lib/api-client.ts`) bumps a version number. Every hook built on `useAsyncData` listens to it and refetches when it changes. This is why adding, editing or deleting an employee updates the dashboard and the list without a page reload, and without a state-management library.

---

## Project structure

```
app/
  layout.tsx                  Root layout: Manrope font, toast provider, dashboard layout
  globals.css                 Colour tokens (blue accent) and base styles
  dashboard/page.tsx          Dashboard page
  employees/page.tsx          Employee list page
  employees/[id]/page.tsx     Employee details page
  employees/[id]/edit/page.tsx  Edit page
  api/dashboard/stats/route.ts  GET stats
  api/employees/route.ts        GET list, POST create
  api/employees/[id]/route.ts   GET one, PATCH update, DELETE

components/
  layout/
    dashboard-layout.tsx      Sidebar + top bar + content frame, mobile drawer state
    sidebar.tsx               Navigation links with the active page highlighted
    topbar.tsx                Mobile-only top bar with the menu button
    mobile-drawer.tsx         Slide-in navigation (native <dialog>)
    nav.ts                    The list of navigation links
    page-header.tsx           Page title, subtitle and action buttons
  dashboard/
    dashboard-stats.tsx       The four stat cards (reads /api/dashboard/stats)
    stat-card.tsx             One stat card
    recent-employees.tsx      "Recent employees" table (5 newest)
  employees/
    employee-directory.tsx    MAIN FILE: the table with search, filter, pagination and delete;
                              also AddEmployeeButton (popup), DeleteEmployeeDialog, EditEmployee
    employee-form.tsx         The add/edit form (used inside the popup and on the edit page)
    employee-table.tsx        The table markup
    row-actions-menu.tsx      The three-dot menu: View / Edit / Delete
    employee-details.tsx      The details page content
  ui/
    button.tsx  input.tsx  modal.tsx  loading.tsx  error-message.tsx
    empty-state.tsx  pagination.tsx  toast-provider.tsx

lib/
  api-client.ts               ALL fetch() calls, ApiError, and the refresh signal
  employee-service.ts         ALL SQL queries (server only)
  db.ts                       PostgreSQL connection pool (server only)
  utils.ts                    Date/currency formatting, response helpers, handleErrors()
  validations/employee-schema.ts  Validation rules shared by form and API
  hooks/
    use-async-data.ts         Generic "load data, show loading/error, refetch" hook
    use-employees.ts          useEmployees, useEmployee, useDashboardStats
    use-delete-employee.ts    Delete-with-confirmation logic
    use-debounced-value.ts    Delays search input by 300 ms

types/employee.ts             Employee types, department list, API result types
db/schema.sql                 The employees table
scripts/init-db.mjs           Creates the database and table (pnpm db:init)
.env.example                  Template for DATABASE_URL
```

---

## API reference

Base URL: `http://localhost:3000`. All bodies are JSON. Dates are `YYYY-MM-DD`.

### Employee object

```json
{
  "id": "3",
  "fullName": "Asha Rao",
  "email": "asha@example.com",
  "department": "Design",
  "jobTitle": "Product Designer",
  "salary": 600000,
  "joiningDate": "2026-10-20",
  "createdAt": "2026-10-21T07:20:54.833Z",
  "updatedAt": "2026-10-21T07:20:54.833Z"
}
```

`department` must be one of: Engineering, Design, Marketing, Sales, Human Resources, Finance, Operations, Customer Support.

### Endpoints

| Method | URL | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/api/employees` | none | 200 `{ data, total, page, pageSize, totalPages }` | 500 |
| POST | `/api/employees` | all six fields | 201 `{ data }` | 400 validation, 409 duplicate email, 500 |
| GET | `/api/employees/[id]` | none | 200 `{ data }` | 404, 500 |
| PATCH | `/api/employees/[id]` | any of the six fields | 200 `{ data }` | 400, 404, 409, 500 |
| DELETE | `/api/employees/[id]` | none | 200 `{ success: true }` | 404, 500 |
| GET | `/api/dashboard/stats` | none | 200 `{ data: { totalEmployees, departmentCount, newThisMonth, recentlyAdded } }` | 500 |

Fields for POST and PATCH: `fullName`, `email`, `department`, `jobTitle`, `salary`, `joiningDate`.

**Query parameters for `GET /api/employees`**

| Parameter | Meaning | Default |
|---|---|---|
| `search` | Matches name or email, case-insensitive | none |
| `department` | Exact department name | all |
| `page` | Page number (clamped to the last page) | 1 |
| `pageSize` | Rows per page (1 to 100) | 10 |
| `sort` | `recent` (newest first) or `name` (A to Z) | `recent` |

**Error shape (every endpoint)**

```json
{ "error": "Please fix the highlighted fields.", "fieldErrors": { "email": "Enter a valid email address." } }
```

`fieldErrors` is present only for 400 and 409 responses.

---

## Database

One table, defined in `db/schema.sql`:

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT` identity | Primary key, generated by PostgreSQL |
| `full_name` | `TEXT` | Required |
| `email` | `TEXT` | Required, **unique** (stored lowercase) |
| `department` | `TEXT` | Required |
| `job_title` | `TEXT` | Required |
| `salary` | `NUMERIC(12,2)` | Required, 0 or more |
| `joining_date` | `DATE` | Required |
| `created_at` | `TIMESTAMPTZ` | Defaults to now |
| `updated_at` | `TIMESTAMPTZ` | Set to now on every update |

Indexes: `department` and `created_at DESC`.

SQL columns are `snake_case`. `lib/employee-service.ts` renames them to the `camelCase` fields of the `Employee` type in one place (`EMPLOYEE_COLUMNS`).

To look at the data, open pgAdmin and select the `employeehub` database (not another one on the same server), then run:

```sql
SELECT * FROM employees ORDER BY id;
```

pgAdmin does not refresh by itself. Re-run the query or press F5 on the Databases list to see new data.

---

## Validation and error handling

**Rules** (`lib/validations/employee-schema.ts`)

- Full name: required, up to 100 characters
- Email: required, valid format, unique
- Department: required, from the fixed list
- Job title: required, up to 100 characters
- Salary: required, a number from 0 to 1,000,000,000
- Joining date: required, a real calendar date

**Where errors come from and how they appear**

| Problem | Detected by | What the user sees |
|---|---|---|
| Missing or invalid field | Browser, then again on the server (400) | Red message under the field, first bad field focused |
| Email already used | PostgreSQL unique constraint (409) | Message under the Email field |
| Employee not found | Server (404) | "Employee not found" page, or an error in the delete popup |
| Database down or wrong `DATABASE_URL` | Server (500) | "Could not reach the database..." with a **Try again** button |
| Network problem | Browser | "Could not reach the server..." with a **Try again** button |

Every request in the UI has a loading state, an error state with a retry button, and an empty state ("No employees found").

---

## Debugging and testing the API

**Terminal.** `pnpm dev` prints one line per API call, followed by the request and response data (development only, so personal data is not written to production logs):

```
[API] POST /api/employees -> 201 (18ms)
  request : {"fullName":"Asha Rao","email":"asha@example.com", ...}
  response: {"data":{"id":"3", ...}}
```

**Browser.** Press F12, open **Network**, filter by **Fetch/XHR**, and click a request to see its payload and response.

**Thunder Client or Postman.** Send the requests from the [API reference](#api-reference). Example: `POST http://localhost:3000/api/employees` with the **JSON** body type and the six fields.

**Database.** Check the table directly with the SQL query above.

---

## Conventions and gotchas

- **Do not run `pnpm build` while `pnpm dev` is running.** Both write to the `.next` folder and the dev server can break (for example with "useToast must be used inside ToastProvider"). If it happens: stop the dev server, delete `.next`, start `pnpm dev` again.
- **Restart `pnpm dev` after editing `.env`.** The server reads it at startup.
- **Cache Components is on.** Anything that reads `params` or `searchParams` (or `usePathname`) must sit inside `<Suspense>`. The pages already do this.
- **Navigation keeps pages alive in the background.** Next.js hides visited pages instead of unmounting them, so state can persist. This is why lists refresh through `invalidateData()` and why forms are rebuilt with a `key` or by unmounting the popup.
- **Hydration warning from a browser extension.** Extensions such as Grammarly add attributes to `<body>`. The layout sets `suppressHydrationWarning` on `<body>` to silence that.
- **Not built yet:** user sign-in, an activity log, and departments as their own table. Departments are a fixed list in `types/employee.ts`.

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| API returns 500 "Could not reach the database" | PostgreSQL stopped, or `DATABASE_URL` is wrong. Check `.env`, restart `pnpm dev` |
| `pnpm db:init`: "password authentication failed" | Wrong password in `.env` (the placeholder `YOUR_PASSWORD` is still there) |
| `pnpm db:init`: "Invalid URL" | `.env` URL is malformed. Check the `@` between password and `localhost` |
| `employeehub` is not in pgAdmin | Refresh the Databases list (F5) and check you are on the same server and port 5432 |
| Added an employee but pgAdmin shows nothing | Re-run the query; pgAdmin grids are snapshots |
| Port 3000 already in use | Another `pnpm dev` is running. Stop it first |
| Odd build or module errors after renaming files | Stop dev, delete `.next`, start again |
#   e m s  
 