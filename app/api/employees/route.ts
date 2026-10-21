import { Pool } from "pg";

// One shared connection pool (kept on globalThis so hot reloads don't open more).
const g = globalThis as unknown as { pool?: Pool };
const pool = (g.pool ??= new Pool({ connectionString: process.env.DATABASE_URL }));

const COLUMNS = `id::text AS id, full_name AS "fullName", email, department, job_title AS "jobTitle",
  salary::float8 AS salary, to_char(joining_date, 'YYYY-MM-DD') AS "joiningDate"`;

async function run(work: () => Promise<Response>) {
  try {
    return await work();
  } catch (error) {
    const duplicate = (error as { code?: string }).code === "23505";
    return Response.json(
      { error: duplicate ? "An employee with this email already exists." : "Database error. Check DATABASE_URL in .env." },
      { status: duplicate ? 409 : 500 },
    );
  }
}

// The six form fields, in the order the SQL expects them.
async function fields(request: Request) {
  const b = await request.json();
  return [b.fullName, b.email, b.department, b.jobTitle, b.salary, b.joiningDate];
}

const id = (request: Request) => new URL(request.url).searchParams.get("id");

export const GET = () =>
  run(async () => {
    const { rows } = await pool.query(`SELECT ${COLUMNS} FROM employees ORDER BY created_at DESC, id DESC`);
    return Response.json({ data: rows });
  });

export const POST = (request: Request) =>
  run(async () => {
    const { rows } = await pool.query(
      `INSERT INTO employees (full_name, email, department, job_title, salary, joining_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLUMNS}`,
      await fields(request),
    );
    return Response.json({ data: rows[0] }, { status: 201 });
  });

export const PUT = (request: Request) =>
  run(async () => {
    await pool.query(
      `UPDATE employees SET full_name = $2, email = $3, department = $4, job_title = $5, salary = $6, joining_date = $7
       WHERE id = $1`,
      [id(request), ...(await fields(request))],
    );
    return Response.json({ success: true });
  });

export const DELETE = (request: Request) =>
  run(async () => {
    await pool.query("DELETE FROM employees WHERE id = $1", [id(request)]);
    return Response.json({ success: true });
  });
