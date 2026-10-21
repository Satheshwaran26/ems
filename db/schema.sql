-- The employees table. Run with:  pnpm db:init
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS employees (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name    TEXT          NOT NULL,
  email        TEXT          NOT NULL UNIQUE,
  department   TEXT          NOT NULL,
  job_title    TEXT          NOT NULL,
  salary       NUMERIC(12,2) NOT NULL CHECK (salary >= 0),
  joining_date DATE          NOT NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS employees_department_idx ON employees (department);
CREATE INDEX IF NOT EXISTS employees_created_at_idx ON employees (created_at DESC);
