import type { FieldErrors } from "@/types/employee";

// Dates are plain "YYYY-MM-DD" strings. They are formatted in UTC so the
// server and the browser always print the same day (no hydration mismatch).

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate.length === 10 ? `${isoDate}T00:00:00Z` : isoDate);
  return Number.isNaN(date.getTime()) ? isoDate : dateFormatter.format(date);
}

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Small helpers so every route handler returns errors in the same shape:
// { error: "message", fieldErrors?: { fieldName: "message" } }
export function errorResponse(message: string, status: number, fieldErrors?: FieldErrors) {
  return Response.json({ error: message, fieldErrors }, { status });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

const MAX_LOGGED_CHARS = 2000;

function shorten(text: string): string {
  return text.length > MAX_LOGGED_CHARS ? `${text.slice(0, MAX_LOGGED_CHARS)}... (truncated)` : text;
}

/**
 * Wraps a route handler. It
 *  1. prints each request in the terminal running `pnpm dev`:
 *       [API] POST /api/employees -> 201 (14ms)
 *         request : {"fullName":"Asha Rao", ...}
 *         response: {"data":{"id":"5", ...}}
 *     (request / response data is only printed in development)
 *  2. turns unexpected failures (usually the database being unreachable) into
 *     a clear JSON error instead of a crash page.
 */
export async function handleErrors(request: Request, run: () => Promise<Response>): Promise<Response> {
  const started = performance.now();
  const url = new URL(request.url);
  const label = `${request.method} ${url.pathname}${url.search}`;
  const logData = process.env.NODE_ENV !== "production";

  // Copy the body for logging first, because a handler can only read it once.
  const requestBody = logData && request.method !== "GET" ? await request.clone().text() : "";

  let response: Response;
  try {
    response = await run();
  } catch (error) {
    console.error(`[API] ${label} failed:`, error);
    response = errorResponse(
      "Could not reach the database. Check DATABASE_URL in .env and that PostgreSQL is running.",
      500,
    );
  }

  console.log(`[API] ${label} -> ${response.status} (${Math.round(performance.now() - started)}ms)`);
  if (logData) {
    if (requestBody) console.log(`  request : ${shorten(requestBody)}`);
    console.log(`  response: ${shorten(await response.clone().text())}`);
  }
  return response;
}
