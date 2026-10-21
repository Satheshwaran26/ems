import { useSyncExternalStore } from "react";

export const DEPARTMENTS = ["Engineering", "Design", "Marketing", "Sales", "Human Resources", "Finance", "Operations", "Customer Support"];

export interface Employee {
  id: string;
  fullName: string;
  email: string;
  department: string;
  jobTitle: string;
  salary: number;
  joiningDate: string; // YYYY-MM-DD
}

export type EmployeeInput = Omit<Employee, "id">;

// Everything the browser needs to talk to /api/employees (PostgreSQL) lives here.
// The list is loaded once, then reloaded after every add / edit / delete.
interface State {
  employees: Employee[] | null; // null until the first load finishes
  error: string;
}

const API = "/api/employees";
const listeners = new Set<() => void>();
let state: State = { employees: null, error: "" };
let started = false;

function setState(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

async function request(url: string, method = "GET", body?: EmployeeInput): Promise<{ data?: Employee[]; error?: string }> {
  try {
    const response = await fetch(url, {
      method,
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: body && JSON.stringify(body),
    });
    const json = await response.json().catch(() => ({}));
    return response.ok ? json : { error: json.error ?? `Request failed (${response.status}).` };
  } catch {
    return { error: "Could not reach the server. Check your connection." };
  }
}

async function load() {
  const { data, error } = await request(API);
  setState(data ? { employees: data, error: "" } : { employees: state.employees, error: error ?? "" });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    load();
  }
  return () => void listeners.delete(listener);
}

/** `employees` is null while loading. `error` is set when the database could not be reached. */
export function useEmployees(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Returns an error message, or null when the save worked. */
export async function saveEmployee(input: EmployeeInput, id?: string): Promise<string | null> {
  const { error } = await request(id ? `${API}?id=${id}` : API, id ? "PUT" : "POST", input);
  if (!error) await load();
  return error ?? null;
}

/** Returns an error message, or null when the delete worked. */
export async function deleteEmployee(id: string): Promise<string | null> {
  const { error } = await request(`${API}?id=${id}`, "DELETE");
  await load();
  return error ?? null;
}
