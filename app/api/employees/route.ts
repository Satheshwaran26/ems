import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, validateEmployee } from "@/lib/employees";

// Every response is { data, ... } on success or { error, fields? } on failure, and is never cached.
// Other HTTP methods get an automatic 405 from Next.js.

const PAGE = 1000; // Supabase returns at most 1000 rows per request, so we read in pages.
const MAX_ROWS = 10_000; // safety cap; the client is told when the list is cut off
const MAX_BODY = 10_000; // bytes
const TIMEOUT_MS = 10_000;

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
    public code?: string,
  ) {
    super(message);
  }
}

let client: SupabaseClient | undefined;
function db() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // SUPABASE_SECRET_KEY (server only) is preferred; it lets you lock the table away from the public key.
    const key = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new HttpError(500, "Server is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) }) },
    });
  }
  return client;
}

const headers = { "Cache-Control": "no-store" };
const ok = (body: object, status = 200) => Response.json(body, { status, headers });

async function run(work: () => Promise<Response>) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof HttpError) {
      const body = { error: error.message, ...(error.fields && { fields: error.fields }), ...(error.code && { code: error.code }) };
      return Response.json(body, { status: error.status, headers });
    }
    console.error("[employees api]", error);
    return Response.json({ error: "Something went wrong on the server." }, { status: 500, headers });
  }
}

// Turns a Supabase error into a safe message; the raw details are only logged on the server.
function dbError(error: { code?: string; message: string }): never {
  console.error("[employees api]", error.code, error.message);
  const code = error.code ?? "";
  if (code === "23505") throw new HttpError(409, "An employee with this email already exists.");
  if (["23514", "23502", "22003", "22P02", "22007", "22008"].includes(code)) throw new HttpError(400, "Some values are not allowed. Check the fields and try again.");
  if (code === "42501") throw new HttpError(403, "The database policies do not allow this action.");
  if (["PGRST205", "42P01"].includes(code)) throw new HttpError(500, "The employees table is missing. Run the SQL from README.md in the Supabase SQL Editor.");
  if (["PGRST204", "42703"].includes(code)) throw new HttpError(500, "The database schema is out of date. Run the SQL from README.md in the Supabase SQL Editor.");
  if (!code) throw new HttpError(503, "Could not reach the database. Try again in a moment.");
  throw new HttpError(500, "Database error.");
}

function parseId(request: Request) {
  const ids = new URL(request.url).searchParams.getAll("id");
  if (ids.length !== 1) throw new HttpError(400, ids.length ? "Send exactly one id." : "Missing id.");
  if (!/^\d{1,18}$/.test(ids[0])) throw new HttpError(400, "Invalid id.");
  return ids[0];
}

async function readText(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY) throw new HttpError(413, "Request is too large.");
  const text = await request.text();
  if (text.length > MAX_BODY) throw new HttpError(413, "Request is too large.");
  return text;
}

async function readEmployee(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new HttpError(415, "Send the body as application/json.");
  const text = await readText(request);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new HttpError(400, "The request body is not valid JSON.");
  }
  const result = validateEmployee(json);
  if (result.errors) throw new HttpError(400, describe(result.errors), result.errors);
  // `version` (optional) is the value the form was loaded with; it detects edits made by someone else.
  const version = (json as { version?: unknown }).version;
  return { value: result.value, version: typeof version === "number" ? version : undefined };
}

const toRow = (e: { fullName: string; email: string; department: string; jobTitle: string; salary: number; joiningDate: string }) => ({
  full_name: e.fullName,
  email: e.email,
  department: e.department,
  job_title: e.jobTitle,
  salary: e.salary,
  joining_date: e.joiningDate,
});

const toEmployee = (r: Record<string, unknown>) => ({
  id: String(r.id),
  fullName: r.full_name,
  email: r.email,
  department: r.department,
  jobTitle: r.job_title,
  salary: Number(r.salary),
  joiningDate: r.joining_date,
  version: r.version ?? undefined, // present once the README SQL has been run
});

export const GET = () =>
  run(async () => {
    const rows = new Map<string, Record<string, unknown>>(); // keyed by id so a shifting page boundary cannot duplicate a row
    let truncated = false;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db()
        .from("employees")
        .select()
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) dbError(error);
      data.forEach((r) => rows.set(String(r.id), r));
      if (data.length < PAGE) break;
      if (rows.size >= MAX_ROWS) {
        truncated = true;
        break;
      }
    }
    return ok({ data: [...rows.values()].map(toEmployee), truncated });
  });

export const POST = (request: Request) =>
  run(async () => {
    const { value } = await readEmployee(request);
    const { data, error } = await db().from("employees").insert(toRow(value)).select().single();
    if (error) dbError(error);
    return ok({ data: toEmployee(data) }, 201);
  });

export const PUT = (request: Request) =>
  run(async () => {
    const id = parseId(request);
    const { value, version } = await readEmployee(request);
    let update = db().from("employees").update(toRow(value)).eq("id", id);
    if (version !== undefined) update = update.eq("version", version);
    const { data, error } = await update.select();
    if (error) dbError(error);
    if (!data.length) {
      // Nothing was updated: either the employee is gone, or someone else changed it first.
      const { data: exists, error: lookupError } = await db().from("employees").select("id").eq("id", id).maybeSingle();
      if (lookupError) dbError(lookupError);
      if (!exists) throw new HttpError(404, "This employee no longer exists. The list has been refreshed.");
      throw new HttpError(409, "Someone else changed this employee first. The list has been refreshed; review the latest values and save again.", undefined, "conflict");
    }
    return ok({ data: toEmployee(data[0]) });
  });

export const DELETE = (request: Request) =>
  run(async () => {
    const id = parseId(request);
    if (await readText(request)) throw new HttpError(400, "DELETE does not take a request body.");
    const { data, error } = await db().from("employees").delete().eq("id", id).select("id");
    if (error) dbError(error);
    if (!data.length) throw new HttpError(404, "This employee was already deleted. The list has been refreshed.");
    return ok({ data: { id } });
  });
