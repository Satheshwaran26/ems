"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Plus, Search, UserX } from "lucide-react";
import { EmployeeForm } from "@/components/employees/employee-form";
import { EmployeeTable } from "@/components/employees/employee-table";
import { Button, buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorMessage } from "@/components/ui/error-message";
import { controlClassName } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useDeleteEmployee } from "@/lib/hooks/use-delete-employee";
import { ApiError } from "@/lib/api-client";
import { useEmployee, useEmployees } from "@/lib/hooks/use-employees";
import { DEPARTMENTS, isDepartment, type Department, type EmployeeSort } from "@/types/employee";

interface EmployeeDirectoryProps {
  heading: string;
  /** Link or button shown at the right of the heading. */
  headerAction?: ReactNode;
  initialSearch?: string;
  initialDepartment?: Department | "";
  /** Rows per page (default 10). */
  pageSize?: number;
  /** Sort order (default: newest first). */
  sort?: EmployeeSort;
}

/**
 * The employee table with search, department filter, pagination and delete.
 * Used on both the dashboard (short list) and the employees page (full list).
 */
export function EmployeeDirectory({
  heading,
  headerAction,
  initialSearch = "",
  initialDepartment = "",
  pageSize = 10,
  sort = "recent",
}: EmployeeDirectoryProps) {
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [department, setDepartment] = useState<Department | "">(initialDepartment);
  const [page, setPage] = useState(1);

  const search = useDebouncedValue(searchInput.trim(), 300);
  const { data, error, isLoading, retry } = useEmployees({
    search,
    department,
    page,
    pageSize,
    sort,
  });
  const del = useDeleteEmployee();

  const hasFilters = searchInput.trim() !== "" || department !== "";

  function clearFilters() {
    setSearchInput("");
    setDepartment("");
    setPage(1);
  }

  let body: ReactNode;
  if (error && !data) {
    body = <ErrorMessage message={error.message} onRetry={retry} />;
  } else if (!data) {
    body = <Loading label="Loading employees..." />;
  } else if (data.total === 0) {
    body = hasFilters ? (
      <EmptyState
        icon={UserX}
        title="No employees found"
        description="No employees match your search or filter. Try different keywords or clear the filters."
      >
        <Button variant="secondary" onClick={clearFilters}>
          Clear filters
        </Button>
      </EmptyState>
    ) : (
      <EmptyState
        icon={UserX}
        title="No employees found"
        description="There are no employees yet. Add your first employee to get started."
      >
        <AddEmployeeButton />
      </EmptyState>
    );
  } else {
    body = (
      <>
        {error && <ErrorMessage message={error.message} onRetry={retry} />}
        <div aria-busy={isLoading} className={isLoading ? "opacity-60 transition-opacity" : undefined}>
          <EmployeeTable employees={data.data} onDelete={del.requestDelete} />
        </div>
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          pageSize={data.pageSize}
          onPageChange={setPage}
        />
      </>
    );
  }

  return (
    <section aria-labelledby="directory-heading" className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="directory-heading" className="text-base font-semibold">
            {heading}
          </h2>
          {headerAction}
        </div>
        <EmployeeFilters
          search={searchInput}
          onSearchChange={(value) => {
            setSearchInput(value);
            setPage(1);
          }}
          department={department}
          onDepartmentChange={(value) => {
            setDepartment(value);
            setPage(1);
          }}
        />
      </div>

      {body}

      {del.target && (
        <DeleteEmployeeDialog
          employeeName={del.target.fullName}
          isDeleting={del.isDeleting}
          error={del.error}
          onConfirm={del.confirmDelete}
          onCancel={del.cancel}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------- filters

interface EmployeeFiltersProps {
  search: string;
  onSearchChange: (search: string) => void;
  department: Department | "";
  onDepartmentChange: (department: Department | "") => void;
}

/** The search box and department dropdown above the employee table. */
function EmployeeFilters({
  search,
  onSearchChange,
  department,
  onDepartmentChange,
}: EmployeeFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <label htmlFor="employee-search" className="sr-only">
          Search employees by name or email
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input
          id="employee-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name or email…"
          className={`${controlClassName()} pl-9`}
        />
      </div>

      <div>
        <label htmlFor="department-filter" className="sr-only">
          Filter by department
        </label>
        <select
          id="department-filter"
          value={department}
          onChange={(event) => onDepartmentChange(isDepartment(event.target.value) ? event.target.value : "")}
          className={`${controlClassName()} sm:w-52`}
        >
          <option value="">All departments</option>
          {DEPARTMENTS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ------------------------------------------------------- add employee popup

/** "Add Employee" button. The form opens in a popup, so there is no separate page. */
export function AddEmployeeButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden="true" />
        Add Employee
      </Button>

      {/* Rendered only while open, so the form starts empty every time */}
      {open && (
        <Modal
          title="Add employee"
          description="Enter the details of the new team member"
          size="lg"
          onClose={() => setOpen(false)}
        >
          <EmployeeForm onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

// ------------------------------------------------------ delete confirmation

interface DeleteEmployeeDialogProps {
  employeeName: string;
  isDeleting: boolean;
  /** Message from a failed delete attempt. */
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteEmployeeDialog({
  employeeName,
  isDeleting,
  error,
  onConfirm,
  onCancel,
}: DeleteEmployeeDialogProps) {
  return (
    <Modal
      title="Delete employee?"
      description={`${employeeName} will be permanently removed. This cannot be undone.`}
      onClose={onCancel}
      dismissible={!isDeleting}
    >
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={isDeleting}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={isDeleting}>
          {error ? "Try again" : "Delete"}
        </Button>
      </div>
    </Modal>
  );
}

// --------------------------------------------------------------- edit page

/** Loads one employee, then shows the form pre-filled with their data. */
export function EditEmployee({ id }: { id: string }) {
  const { data: employee, error, isLoading, retry } = useEmployee(id);

  if (error && !employee) {
    if (error instanceof ApiError && error.status === 404) return <NotFound />;
    return <ErrorMessage message={error.message} onRetry={retry} />;
  }
  if (!employee) return isLoading ? <Loading label="Loading employee..." /> : <NotFound />;

  // `key` rebuilds the form when the saved data changes, so it never shows stale values.
  return <EmployeeForm key={employee.updatedAt} employee={employee} />;
}

function NotFound() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <EmptyState
        icon={UserX}
        title="Employee not found"
        description="This employee may have been deleted, or the link is incorrect."
      >
        <Link href="/employees" className={buttonStyles({ variant: "secondary" })}>
          Back to employees
        </Link>
      </EmptyState>
    </div>
  );
}
