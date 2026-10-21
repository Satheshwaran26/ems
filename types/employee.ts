// The list of departments the app knows about.
// For now this is a fixed list. It could become its own table later.
export const DEPARTMENTS = [
  "Engineering",
  "Design",
  "Marketing",
  "Sales",
  "Human Resources",
  "Finance",
  "Operations",
  "Customer Support",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export function isDepartment(value: unknown): value is Department {
  return typeof value === "string" && (DEPARTMENTS as readonly string[]).includes(value);
}

/** An employee as returned by the API. Dates are ISO strings. */
export interface Employee {
  id: string;
  fullName: string;
  email: string;
  department: Department;
  jobTitle: string;
  salary: number;
  /** Calendar date, formatted YYYY-MM-DD. */
  joiningDate: string;
  /** Full ISO timestamp of when the record was created. */
  createdAt: string;
  updatedAt: string;
}

/** The fields a user can edit. This is what POST / PATCH accept. */
export type EmployeeInput = Omit<Employee, "id" | "createdAt" | "updatedAt">;

export type EmployeeSort = "recent" | "name";

export interface EmployeeListQuery {
  search?: string;
  department?: Department | "";
  page?: number;
  pageSize?: number;
  sort?: EmployeeSort;
}

export interface EmployeeListResult {
  data: Employee[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  totalEmployees: number;
  departmentCount: number;
  newThisMonth: number;
  /** Employees whose record was created in the last 7 days. */
  recentlyAdded: number;
}

export type FieldErrors = Partial<Record<keyof EmployeeInput, string>>;
