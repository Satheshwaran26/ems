"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, UserX } from "lucide-react";
import { DeleteEmployeeDialog } from "@/components/employees/employee-directory";
import { Button, buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { useDeleteEmployee } from "@/lib/hooks/use-delete-employee";
import { useEmployee } from "@/lib/hooks/use-employees";
import { ApiError } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";

export function EmployeeDetails({ id }: { id: string }) {
  const router = useRouter();
  const { data: employee, error, isLoading, retry } = useEmployee(id);
  const del = useDeleteEmployee(() => router.push("/employees"));

  if (error && !employee) {
    return error instanceof ApiError && error.status === 404 ? (
      <NotFound />
    ) : (
      <ErrorMessage message={error.message} onRetry={retry} />
    );
  }
  if (!employee) return isLoading ? <Loading label="Loading employee..." /> : <NotFound />;

  const details: { label: string; value: React.ReactNode }[] = [
    { label: "Email", value: <a href={`mailto:${employee.email}`} className="text-brand-700 hover:underline">{employee.email}</a> },
    { label: "Department", value: employee.department },
    { label: "Job title", value: employee.jobTitle },
    { label: "Annual salary", value: formatCurrency(employee.salary) },
    { label: "Joining date", value: formatDate(employee.joiningDate) },
    { label: "Record created", value: formatDate(employee.createdAt) },
    { label: "Last updated", value: formatDate(employee.updatedAt) },
  ];

  return (
    <div className="max-w-3xl">
      <Link href="/employees" className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to employees
      </Link>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{employee.fullName}</h1>
            <p className="text-sm text-gray-600">
              {employee.jobTitle} · {employee.department}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/employees/${employee.id}/edit`} className={buttonStyles({ variant: "secondary" })}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </Link>
            <Button variant="danger" onClick={() => del.requestDelete(employee)}>
              <Trash2 className="size-4" aria-hidden="true" />
              Delete
            </Button>
          </div>
        </div>

        <dl className="grid gap-x-8 gap-y-5 p-6 sm:grid-cols-2">
          {details.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
              <dd className="mt-1 text-sm text-gray-900 [overflow-wrap:anywhere]">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {del.target && (
        <DeleteEmployeeDialog
          employeeName={del.target.fullName}
          isDeleting={del.isDeleting}
          error={del.error}
          onConfirm={del.confirmDelete}
          onCancel={del.cancel}
        />
      )}
    </div>
  );
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
