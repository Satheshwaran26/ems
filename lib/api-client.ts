import { useSyncExternalStore } from "react";
import type {
  DashboardStats,
  Employee,
  EmployeeInput,
  EmployeeListQuery,
  EmployeeListResult,
  FieldErrors,
} from "@/types/employee";

// Everything the browser needs to talk to our API lives in this file.
// Components never call fetch() directly.

// ---------------------------------------------------------------- fetch wrapper

/** Error thrown by every API helper so components can show a useful message. */
export class ApiError extends Error {
  status: number;
  fieldErrors?: FieldErrors;

  constructor(message: string, status: number, fieldErrors?: FieldErrors) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** A thin wrapper around fetch: sends JSON, parses JSON, throws ApiError. */
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const failure = (body ?? {}) as { error?: string; fieldErrors?: FieldErrors };
    throw new ApiError(
      failure.error ?? `Request failed with status ${response.status}.`,
      response.status,
      failure.fieldErrors,
    );
  }
  return body as T;
}

// ------------------------------------------------------- refresh after changes

// A tiny "data changed" signal. After any create / update / delete we call
// `invalidateData()`. Every hook that loads data listens to the version
// number and re-fetches when it changes. This keeps the dashboard, the
// employee list in sync without a state library.

let version = 0;
const listeners = new Set<() => void>();

function invalidateData() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDataVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

// ------------------------------------------------------------------ employees

export function fetchEmployees(query: EmployeeListQuery): Promise<EmployeeListResult> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.department) params.set("department", query.department);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.sort) params.set("sort", query.sort);
  return apiFetch<EmployeeListResult>(`/api/employees?${params.toString()}`);
}

export async function fetchEmployee(id: string): Promise<Employee> {
  const body = await apiFetch<{ data: Employee }>(`/api/employees/${encodeURIComponent(id)}`);
  return body.data;
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  const body = await apiFetch<{ data: Employee }>("/api/employees", {
    method: "POST",
    body: JSON.stringify(input),
  });
  invalidateData();
  return body.data;
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<Employee> {
  const body = await apiFetch<{ data: Employee }>(`/api/employees/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  invalidateData();
  return body.data;
}

export async function deleteEmployee(id: string): Promise<void> {
  await apiFetch<{ success: true }>(`/api/employees/${encodeURIComponent(id)}`, { method: "DELETE" });
  invalidateData();
}

// ------------------------------------------------------------------- dashboard

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const body = await apiFetch<{ data: DashboardStats }>("/api/dashboard/stats");
  return body.data;
}
