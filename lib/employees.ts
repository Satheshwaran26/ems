import { useSyncExternalStore } from "react";

export { DEPARTMENTS } from "./validate";

export interface Employee {
  id: string;
  fullName: string;
  email: string;
  department: string;
  jobTitle: string;
  salary: number;
  joiningDate: string; // YYYY-MM-DD
  version?: number; // changes on every save; lets the server spot edits made by someone else
}

export type EmployeeInput = Omit<Employee, "id" | "version">;

interface State {
  employees: Employee[] | null;
  error: string; // the latest refresh problem; shown while older data is still on screen
  truncated: boolean; // the server had more employees than it could send
}

interface Reply {
  status: number; // 0 means the server could not be reached
  error?: string;
  code?: string; // "conflict" when someone else changed the employee first
  data?: unknown;
  truncated?: boolean;
}

const API = "/api/employees";
const TIMEOUT_MS = 15_000;
const listeners = new Set<() => void>();
let state: State = { employees: null, error: "", truncated: false };
let started = false;
let latest = 0;

function setState(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

async function request(url: string, method = "GET", body?: object): Promise<Reply> {
  try {
    const response = await fetch(url, {
      method,
      cache: "no-store",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body && JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = (await response.json().catch(() => null)) ?? {};
    return response.ok ? { ...json, status: response.status } : { status: response.status, error: json.error ?? `Request failed (${response.status}).`, code: json.code };
  } catch {
    return { status: 0, error: "Could not reach the server. Check your connection." };
  }
}

function isEmployee(value: unknown): value is Employee {
  const e = value as Record<string, unknown> | null;
  return (
    typeof e === "object" &&
    e !== null &&
    ["id", "fullName", "email", "department", "jobTitle", "joiningDate"].every((key) => typeof e[key] === "string") &&
    typeof e.salary === "number" &&
    Number.isFinite(e.salary)
  );
}

export async function reload() {
  const ticket = ++latest;
  const reply = await request(API);
  if (ticket !== latest) return; // a newer refresh is already running; ignore this stale answer
  if (!reply.error && Array.isArray(reply.data) && reply.data.every(isEmployee)) {
    setState({ employees: reply.data, error: "", truncated: reply.truncated === true });
  } else {
    setState({ ...state, error: reply.error ?? "The server sent data in an unexpected format." });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    reload();
  }
  return () => void listeners.delete(listener);
}

/** The latest state, for code that runs after an await and cannot rely on a render. */
export const current = () => state;

export function useEmployees(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export interface Result {
  error: string | null; // problem with the change itself
  gone?: boolean; // the employee no longer exists
  conflict?: boolean; // someone else changed the employee first
}

async function change(url: string, method: string, body?: object): Promise<Result> {
  const reply = await request(url, method, body);
  // Refresh after success (to show the change), after a conflict or missing row (to show the real data),
  // and after a network or server failure (we cannot tell whether the change was applied).
  if (!reply.error || [404, 409].includes(reply.status) || reply.status === 0 || reply.status >= 500) await reload();
  if (reply.status === 0) {
    return { error: "Could not confirm whether the change was saved. The list is refreshing; check it before trying again." };
  }
  return { error: reply.error ?? null, gone: reply.status === 404, conflict: reply.code === "conflict" };
}

export const saveEmployee = (input: EmployeeInput, id?: string, version?: number) =>
  change(id ? `${API}?id=${encodeURIComponent(id)}` : API, id ? "PUT" : "POST", { ...input, version });

export const deleteEmployee = (id: string) => change(`${API}?id=${encodeURIComponent(id)}`, "DELETE");
