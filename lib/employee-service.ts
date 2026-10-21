// SERVER ONLY. Import this file from route handlers, never from client components.
//
// All employee data lives in PostgreSQL (table "employees", see db/schema.sql).
// Every query uses $1, $2... placeholders, so user input is never pasted into
// the SQL text (this prevents SQL injection).

import { getPool } from "@/lib/db";
import { DEPARTMENTS } from "@/types/employee";
import type {
  DashboardStats,
  Employee,
  EmployeeInput,
  EmployeeListQuery,
  EmployeeListResult,
} from "@/types/employee";

// Column list shared by every query. It renames the snake_case columns to the
// camelCase fields of the Employee type and formats values for JSON.
const EMPLOYEE_COLUMNS = `
  id::text                              AS id,
  full_name                             AS "fullName",
  email,
  department,
  job_title                             AS "jobTitle",
  salary::float8                        AS salary,
  to_char(joining_date, 'YYYY-MM-DD')   AS "joiningDate",
  created_at                            AS "createdAt",
  updated_at                            AS "updatedAt"
`;

interface EmployeeRow extends Omit<Employee, "createdAt" | "updatedAt"> {
  createdAt: Date;
  updatedAt: Date;
}

function toEmployee(row: EmployeeRow): Employee {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

/** Ids are numbers in the database. Anything else cannot match a row. */
function isValidId(id: string): boolean {
  return /^\d{1,18}$/.test(id);
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("An employee with this email already exists.");
  }
}

const UNIQUE_VIOLATION = "23505";
function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === UNIQUE_VIOLATION;
}

/** Makes % and _ in the search text match literally inside ILIKE. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, "\\$&");
}

export async function listEmployees(query: EmployeeListQuery): Promise<EmployeeListResult> {
  const pool = getPool();
  const pageSize = Math.min(Math.max(query.pageSize ?? 10, 1), 100);

  const conditions: string[] = [];
  const values: unknown[] = [];

  const search = (query.search ?? "").trim();
  if (search) {
    values.push(`%${escapeLike(search)}%`);
    conditions.push(`(full_name ILIKE $${values.length} OR email ILIKE $${values.length})`);
  }
  if (query.department) {
    values.push(query.department);
    conditions.push(`department = $${values.length}`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await pool.query<{ total: number }>(
    `SELECT count(*)::int AS total FROM employees ${where}`,
    values,
  );
  const total = countResult.rows[0].total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(query.page ?? 1, 1), totalPages);

  const orderBy = query.sort === "name" ? "full_name ASC, id ASC" : "created_at DESC, id DESC";
  const rows = await pool.query<EmployeeRow>(
    `SELECT ${EMPLOYEE_COLUMNS} FROM employees ${where}
     ORDER BY ${orderBy}
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, pageSize, (page - 1) * pageSize],
  );

  return { data: rows.rows.map(toEmployee), total, page, pageSize, totalPages };
}

export async function getEmployee(id: string): Promise<Employee | null> {
  if (!isValidId(id)) return null;
  const result = await getPool().query<EmployeeRow>(
    `SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE id = $1`,
    [id],
  );
  return result.rows[0] ? toEmployee(result.rows[0]) : null;
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  try {
    const result = await getPool().query<EmployeeRow>(
      `INSERT INTO employees (full_name, email, department, job_title, salary, joining_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${EMPLOYEE_COLUMNS}`,
      [input.fullName, input.email, input.department, input.jobTitle, input.salary, input.joiningDate],
    );
    return toEmployee(result.rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateEmailError();
    throw error;
  }
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<Employee | null> {
  if (!isValidId(id)) return null;
  try {
    const result = await getPool().query<EmployeeRow>(
      `UPDATE employees
       SET full_name = $2, email = $3, department = $4, job_title = $5,
           salary = $6, joining_date = $7, updated_at = now()
       WHERE id = $1
       RETURNING ${EMPLOYEE_COLUMNS}`,
      [id, input.fullName, input.email, input.department, input.jobTitle, input.salary, input.joiningDate],
    );
    return result.rows[0] ? toEmployee(result.rows[0]) : null;
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateEmailError();
    throw error;
  }
}

export async function deleteEmployee(id: string): Promise<boolean> {
  if (!isValidId(id)) return false;
  const result = await getPool().query("DELETE FROM employees WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const pool = getPool();

  const totals = await pool.query<{ total: number; newThisMonth: number; recentlyAdded: number }>(
    `SELECT
       count(*)::int AS total,
       (count(*) FILTER (WHERE date_trunc('month', joining_date) = date_trunc('month', current_date)))::int
         AS "newThisMonth",
       (count(*) FILTER (WHERE created_at >= now() - interval '7 days'))::int AS "recentlyAdded"
     FROM employees`,
  );
  const { total, newThisMonth, recentlyAdded } = totals.rows[0];

  return {
    totalEmployees: total,
    departmentCount: DEPARTMENTS.length,
    newThisMonth,
    recentlyAdded,
  };
}
