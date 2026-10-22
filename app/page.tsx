"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type InputHTMLAttributes } from "react";
import { DEPARTMENTS, LIMITS, describe, validateEmployee, type Employee, type EmployeeInput } from "@/lib/employees";

// ---- Data store: loads the list from the API and keeps it in sync after every change ----

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

async function reload() {
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
const current = () => state;

function useEmployees(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

interface Result {
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

const saveEmployee = (input: EmployeeInput, id?: string, version?: number) =>
  change(id ? `${API}?id=${encodeURIComponent(id)}` : API, id ? "PUT" : "POST", { ...input, version });

const deleteEmployee = (id: string) => change(`${API}?id=${encodeURIComponent(id)}`, "DELETE");

// ---- Page ----

const EMPTY = { fullName: "", email: "", department: DEPARTMENTS[0], jobTitle: "", salary: "", joiningDate: "" };
const toForm = (e: Employee) => ({ fullName: e.fullName, email: e.email, department: e.department, jobTitle: e.jobTitle, salary: String(e.salary), joiningDate: e.joiningDate });
const input = "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm";
const button = "rounded px-3 py-2 text-sm font-medium disabled:opacity-50";

export default function Home() {
  const { employees, error: loadError, truncated } = useEmployees();
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<Employee>(); // the employee being edited, as it was when editing began
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false); // blocks a second click before the next render

  // Warn before the tab is closed or refreshed with unsaved input.
  const dirty = JSON.stringify(form) !== JSON.stringify(editing ? toForm(editing) : EMPTY);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!employees) {
    return (
      <div className="space-y-3 p-8">
        <p className={loadError ? "text-red-600" : "text-gray-600"}>{loadError || "Loading..."}</p>
        {loadError && (
          <button onClick={reload} className={`${button} border border-gray-300`}>
            Try again
          </button>
        )}
      </div>
    );
  }

  const query = search.trim().toLowerCase();
  const shown = employees.filter((e) => (!department || e.department === department) && `${e.fullName} ${e.email}`.toLowerCase().includes(query));

  function reset() {
    setForm(EMPTY);
    setEditing(undefined);
    setError("");
  }

  // The employee being edited was deleted elsewhere: leave edit mode and say so.
  if (editing && !employees.some((e) => e.id === editing.id)) {
    reset();
    setError("The employee you were editing no longer exists.");
  }

  function edit(e: Employee) {
    setForm(toForm(e));
    setEditing(e);
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busyRef.current) return;
    const result = validateEmployee({ ...form, salary: form.salary.trim() === "" ? undefined : Number(form.salary) });
    if (result.errors) return setError(describe(result.errors));
    if (editing && !dirty) return reset(); // nothing changed

    busyRef.current = true;
    setBusy(true);
    const { error: message, gone, conflict } = await saveEmployee(result.value, editing?.id, editing?.version);
    busyRef.current = false;
    setBusy(false);

    if (gone) {
      reset();
      setError(message ?? "");
    } else if (conflict) {
      // Keep what the user typed, but base it on the latest saved version so a second Save is deliberate.
      setEditing(current().employees?.find((e) => e.id === editing?.id));
      setError(message ?? "");
    } else if (message) {
      setError(message);
    } else {
      reset();
    }
  }

  async function remove(e: Employee) {
    if (busyRef.current || !confirm(`Delete ${e.fullName}?`)) return;
    busyRef.current = true;
    setBusy(true);
    const { error: message, gone } = await deleteEmployee(e.id);
    busyRef.current = false;
    setBusy(false);
    if (editing?.id === e.id && (!message || gone)) reset();
    setError(message ?? "");
  }

  const field = (key: keyof typeof EMPTY, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input className={input} aria-label={label} placeholder={label} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
  );

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">EmployeeHub</h1>

      {error && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {loadError && (
        <p role="status" className="flex items-center gap-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Showing the last list that loaded. Refreshing failed: {loadError}
          <button onClick={reload} className="font-medium underline">
            Retry
          </button>
        </p>
      )}
      {truncated && <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">The list is very long, so only the newest employees are shown.</p>}

      <form noValidate onSubmit={submit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-semibold">{editing ? "Edit employee" : "Add employee"}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {field("fullName", "Full name", { maxLength: LIMITS.name })}
          {field("email", "Email", { type: "email", maxLength: LIMITS.email })}
          {field("jobTitle", "Job title", { maxLength: LIMITS.jobTitle })}
          <select className={input} aria-label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          {field("salary", "Annual salary (₹)", { type: "number", min: 0, max: LIMITS.maxSalary, step: "0.01" })}
          {field("joiningDate", "Joining date", { type: "date", min: LIMITS.minDate, max: LIMITS.maxDate })}
        </div>
        <div className="flex gap-2">
          <button disabled={busy} className={`${button} bg-blue-600 text-white`}>
            {busy ? "Saving..." : editing ? "Save changes" : "Add employee"}
          </button>
          {editing && (
            <button type="button" disabled={busy} onClick={reset} className={`${button} border border-gray-300`}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row">
          <input className={input} aria-label="Search" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={`${input} sm:w-56`} aria-label="Filter by department" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>

        {shown.length === 0 ? (
          <div className="space-y-2 p-8 text-center text-sm text-gray-600">
            <p>{employees.length === 0 ? "No employees yet. Add the first one above." : "No employees match your search or filter."}</p>
            {employees.length > 0 && (
              <button
                onClick={() => {
                  setSearch("");
                  setDepartment("");
                }}
                className="text-blue-700 hover:underline"
              >
                Clear search and filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  {["Name", "Email", "Department", "Job title", "Salary", "Joined", ""].map((h) => (
                    <th key={h} className="px-4 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((e) => (
                  <tr key={e.id}>
                    <td className="max-w-48 wrap-break-word px-4 py-2 font-medium">{e.fullName}</td>
                    <td className="max-w-56 break-all px-4 py-2">{e.email}</td>
                    <td className="px-4 py-2">{e.department}</td>
                    <td className="max-w-48 wrap-break-word px-4 py-2">{e.jobTitle}</td>
                    <td className="px-4 py-2">₹{e.salary.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2">{e.joiningDate}</td>
                    <td className="space-x-3 whitespace-nowrap px-4 py-2 text-right">
                      <button disabled={busy} onClick={() => edit(e)} className="text-blue-700 hover:underline disabled:opacity-50">
                        Edit
                      </button>
                      <button disabled={busy} onClick={() => remove(e)} className="text-red-700 hover:underline disabled:opacity-50">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
