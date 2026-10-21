import { DEPARTMENTS, isDepartment } from "@/types/employee";
import type { EmployeeInput, FieldErrors } from "@/types/employee";

// This file is shared: the form uses it for instant feedback and the API
// route uses it again, because the server must never trust the browser.

type ValidationResult =
  | { ok: true; value: EmployeeInput }
  | { ok: false; errors: FieldErrors };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Accepts anything (form values or a JSON body) and checks every field. */
export function validateEmployeeInput(raw: unknown): ValidationResult {
  const input = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  const fullName = text(input.fullName);
  if (!fullName) errors.fullName = "Full name is required.";
  else if (fullName.length > 100) errors.fullName = "Full name must be 100 characters or fewer.";

  const email = text(input.email).toLowerCase();
  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";

  const department = text(input.department);
  if (!department) errors.department = "Select a department.";
  else if (!isDepartment(department)) errors.department = "Select a valid department.";

  const jobTitle = text(input.jobTitle);
  if (!jobTitle) errors.jobTitle = "Job title is required.";
  else if (jobTitle.length > 100) errors.jobTitle = "Job title must be 100 characters or fewer.";

  const salaryText = typeof input.salary === "number" ? String(input.salary) : text(input.salary);
  const salary = Number(salaryText);
  if (!salaryText) errors.salary = "Salary is required.";
  else if (!Number.isFinite(salary) || salary < 0) errors.salary = "Enter a valid salary (0 or more).";
  else if (salary > 1_000_000_000) errors.salary = "Salary is too large.";

  const joiningDate = text(input.joiningDate);
  if (!joiningDate) errors.joiningDate = "Joining date is required.";
  else if (!isRealDate(joiningDate)) errors.joiningDate = "Enter a valid date.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      fullName,
      email,
      department: department as (typeof DEPARTMENTS)[number],
      jobTitle,
      salary,
      joiningDate,
    },
  };
}
