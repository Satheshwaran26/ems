# EmployeeHub

A small employee manager built with Next.js and PostgreSQL. Add, edit, delete, search and filter employees.

```bash
pnpm install
pnpm dev   # http://localhost:3000
```

Put your database URL in `.env` (the `employees` table must already exist):

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/employeehub"
```

## Files

| File | What it does |
|---|---|
| `app/page.tsx` | The whole page: form, search, filter and table |
| `lib/employees.ts` | Employee type, department list and the browser code that calls the API |
| `app/api/employees/route.ts` | The only backend file: GET, POST, PUT and DELETE against PostgreSQL |
| `app/layout.tsx` | Root layout |
| `app/globals.css` | Tailwind import and base colours |
