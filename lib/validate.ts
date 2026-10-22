// Validation rules shared by the browser form and the API route, so both always agree.
import type { EmployeeInput } from "./employees";

export const DEPARTMENTS = ["Engineering", "Design", "Marketing", "Sales", "Human Resources", "Finance", "Operations", "Customer Support"];

export const LIMITS = {
  name: 100,
  jobTitle: 100,
  email: 254,
  maxSalary: 9_999_999_999.99, // NUMERIC(12,2)
  minDate: "1900-01-01",
  maxDate: "2100-12-31", // future joining dates are allowed (incoming hires)
};

type Errors = Partial<Record<keyof EmployeeInput, string>>;
export type Validation = { value: EmployeeInput; errors?: undefined } | { value?: undefined; errors: Errors };

const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

function isRealDate(text: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

/**
 * Checks an unknown value (form state or request body) and returns the cleaned employee.
 * Only the six known fields are read, so extras such as `id` or `created_at` are ignored.
 * Policies: salary must be a JSON number with at most 2 decimals; text is trimmed, never truncated;
 * email is trimmed and lower-cased.
 */
export function validateEmployee(raw: unknown): Validation {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { errors: { fullName: "Request body must be an object with the employee fields." } };
  }
  const b = raw as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const errors: Errors = {};

  const fullName = text(b.fullName);
  if (!fullName) errors.fullName = "Full name is required.";
  else if (fullName.length > LIMITS.name) errors.fullName = `Full name must be at most ${LIMITS.name} characters.`;

  const email = text(b.email).toLowerCase();
  if (!email) errors.email = "Email is required.";
  else if (email.length > LIMITS.email) errors.email = `Email must be at most ${LIMITS.email} characters.`;
  else if (!EMAIL.test(email) || email.split(".").pop()!.length < 2) errors.email = "Enter a valid email address.";

  const department = typeof b.department === "string" ? b.department : "";
  if (!department) errors.department = "Department is required.";
  else if (!DEPARTMENTS.includes(department)) errors.department = "Choose a department from the list.";

  const jobTitle = text(b.jobTitle);
  if (!jobTitle) errors.jobTitle = "Job title is required.";
  else if (jobTitle.length > LIMITS.jobTitle) errors.jobTitle = `Job title must be at most ${LIMITS.jobTitle} characters.`;

  const salary = b.salary;
  if (salary === undefined || salary === null || salary === "") errors.salary = "Salary is required.";
  else if (typeof salary !== "number" || !Number.isFinite(salary)) errors.salary = "Salary must be a number.";
  else if (salary < 0) errors.salary = "Salary must be 0 or more.";
  else if (salary > LIMITS.maxSalary) errors.salary = "Salary is too large.";
  else if (Math.abs(salary * 100 - Math.round(salary * 100)) > 1e-6) errors.salary = "Salary can have at most 2 decimal places.";

  const joiningDate = typeof b.joiningDate === "string" ? b.joiningDate : "";
  if (!joiningDate) errors.joiningDate = "Joining date is required.";
  else if (!isRealDate(joiningDate)) errors.joiningDate = "Joining date must be a real date (YYYY-MM-DD).";
  else if (joiningDate < LIMITS.minDate || joiningDate > LIMITS.maxDate) errors.joiningDate = `Joining date must be between ${LIMITS.minDate} and ${LIMITS.maxDate}.`;

  if (Object.keys(errors).length) return { errors };
  return { value: { fullName, email, department, jobTitle, salary: salary as number, joiningDate } };
}

/** One readable sentence for the UI. */
export const describe = (errors: Errors) => Object.values(errors).join(" ");
