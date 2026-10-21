"use client";

import { useState, type FormEvent } from "react";
import { DEPARTMENTS, deleteEmployee, saveEmployee, useEmployees, type Employee } from "@/lib/employees";

const EMPTY = { fullName: "", email: "", department: DEPARTMENTS[0], jobTitle: "", salary: "", joiningDate: "" };
const input = "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm";
const button = "rounded px-3 py-2 text-sm font-medium";

export default function Home() {
  const { employees, error: loadError } = useEmployees();
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string>();
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");

  if (!employees) {
    return <p className={`p-8 ${loadError ? "text-red-600" : "text-gray-600"}`}>{loadError || "Loading..."}</p>;
  }

  const shown = employees.filter(
    (e) =>
      (!department || e.department === department) &&
      `${e.fullName} ${e.email}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  function reset() {
    setForm(EMPTY);
    setEditingId(undefined);
    setError("");
  }

  function edit(e: Employee) {
    setForm({ ...e, salary: String(e.salary) });
    setEditingId(e.id);
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const { fullName, email, jobTitle, joiningDate } = form;
    const salary = Number(form.salary);
    if (!fullName.trim() || !jobTitle.trim() || !joiningDate || form.salary === "" || salary < 0) {
      return setError("Please fill in every field (salary must be 0 or more).");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address.");

    const message = await saveEmployee(
      { ...form, fullName: fullName.trim(), email: email.trim().toLowerCase(), jobTitle: jobTitle.trim(), salary },
      editingId,
    );
    if (message) setError(message);
    else reset();
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">EmployeeHub</h1>



      <form onSubmit={submit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-semibold">{editingId ? "Edit employee" : "Add employee"}</h2>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          <input className={input} placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <input className={input} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className={input} placeholder="Job title" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
          <select className={input} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <input className={input} type="number" min={0} placeholder="Annual salary (₹)" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
          <input className={input} type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <button className={`${button} bg-blue-600 text-white`}>{editingId ? "Save changes" : "Add employee"}</button>
          {editingId && (
            <button type="button" onClick={reset} className={`${button} border border-gray-300`}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row">
          <input className={input} placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={`${input} sm:w-56`} value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>

        {shown.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-600">No employees found.</p>
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
                    <td className="px-4 py-2 font-medium">{e.fullName}</td>
                    <td className="px-4 py-2">{e.email}</td>
                    <td className="px-4 py-2">{e.department}</td>
                    <td className="px-4 py-2">{e.jobTitle}</td>
                    <td className="px-4 py-2">₹{e.salary.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2">{e.joiningDate}</td>
                    <td className="space-x-3 px-4 py-2 text-right">
                      <button onClick={() => edit(e)} className="text-blue-700 hover:underline">
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete ${e.fullName}?`)) setError((await deleteEmployee(e.id)) ?? "");
                        }}
                        className="text-red-700 hover:underline"
                      >
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
