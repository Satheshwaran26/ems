# EmployeeHub

A simple employee manager. Add, edit, delete, search and filter employees on one page.

Built with Next.js, React, Tailwind CSS and Supabase (PostgreSQL).

## Features

- Add, edit and delete employees (name, email, department, job title, salary, joining date)
- Search by name or email, and filter by department
- Checks for bad input, duplicate emails and two people editing the same employee

## Setup

1. Install and start:

   ```bash
   pnpm install
   pnpm dev      # http://localhost:3000
   ```

2. Create a free project at [supabase.com](https://supabase.com), then create a `.env` file in the project folder:

   ```
   NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
   ```

   You can find both values in Supabase under **Project Settings → API Keys**.

3. In Supabase open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. This creates the `employees` table.

4. Refresh the page. You can now add employees.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start the app locally |
| `pnpm build` | Build for production |
| `pnpm test` | Run the validation tests |
| `pnpm lint` | Check the code style |

## Project files

| File | What it does |
|---|---|
| `app/page.tsx` | The page: form, search, filter and table |
| `app/api/employees/route.ts` | The API that talks to Supabase |
| `lib/employees.ts` | Browser code that calls the API |
| `lib/validate.ts` | Input rules used by both the form and the API |
| `supabase/schema.sql` | The database table and rules |

## Important

There is no login yet. Anyone who can open the app can see and change every employee, including salaries, so use test data only. See [SPEC.md](SPEC.md) for how to lock the database down, the API, diagrams, data details and edge cases, and [PRD.md](PRD.md) for what the product should do.
