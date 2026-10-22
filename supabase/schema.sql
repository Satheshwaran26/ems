-- EmployeeHub database schema. Run this in Supabase: SQL Editor -> New query -> Run.
-- It is safe to run more than once, and it upgrades an existing employees table in place.

create table if not exists employees (
  id           bigint generated always as identity primary key,
  full_name    text          not null,
  email        text          not null unique,
  department   text          not null,
  job_title    text          not null,
  salary       numeric(12,2) not null check (salary >= 0),
  joining_date date          not null,
  created_at   timestamptz   not null default now()
);

-- Added after the first version: change tracking.
alter table employees add column if not exists updated_at timestamptz not null default now();
alter table employees add column if not exists version    bigint      not null default 1;

create index if not exists employees_department_idx on employees (department);

-- One email, whatever its capitalisation.
create unique index if not exists employees_email_lower_key on employees (lower(email));

-- Rules the database enforces even if something bypasses the app.
-- "not valid" keeps old rows untouched; every new or changed row is checked.
alter table employees drop constraint if exists employees_email_clean;
alter table employees add  constraint employees_email_clean
  check (email = lower(btrim(email)) and char_length(email) between 3 and 254) not valid;

alter table employees drop constraint if exists employees_text_length;
alter table employees add  constraint employees_text_length
  check (char_length(btrim(full_name)) between 1 and 100 and char_length(btrim(job_title)) between 1 and 100) not valid;

alter table employees drop constraint if exists employees_department_allowed;
alter table employees add  constraint employees_department_allowed
  check (department in ('Engineering','Design','Marketing','Sales','Human Resources','Finance','Operations','Customer Support')) not valid;

alter table employees drop constraint if exists employees_joining_date_range;
alter table employees add  constraint employees_joining_date_range
  check (joining_date between date '1900-01-01' and date '2100-12-31') not valid;

-- Every update bumps version and updated_at. The app uses version to notice edits made by someone else,
-- and clients cannot set either value themselves.
create or replace function employees_touch() returns trigger language plpgsql as $$
begin
  new.created_at := old.created_at;
  new.updated_at := now();
  new.version    := old.version + 1;
  return new;
end $$;

drop trigger if exists employees_touch on employees;
create trigger employees_touch before update on employees for each row execute function employees_touch();

-- Access: Supabase exposes tables in the public schema through its REST API.
alter table employees enable row level security;

-- Option A (works with only the publishable key in .env): anyone holding the key can read and write.
-- Fine for a demo; NOT safe for real salary data.
drop policy if exists "app can read and write employees" on employees;
create policy "app can read and write employees" on employees for all to anon using (true) with check (true);

-- Option B (recommended): put the project's secret key in .env as SUPABASE_SECRET_KEY (server only, never NEXT_PUBLIC_),
-- then run the next line so the public key can no longer touch this table at all.
-- drop policy if exists "app can read and write employees" on employees;
