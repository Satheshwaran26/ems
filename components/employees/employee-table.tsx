import Link from "next/link";
import { RowActionsMenu } from "@/components/employees/row-actions-menu";
import { formatDate, getInitials } from "@/lib/utils";
import type { Employee } from "@/types/employee";

interface EmployeeTableProps {
  employees: Employee[];
  onDelete: (employee: Employee) => void;
}

const headerCell = "px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500";

export function EmployeeTable({ employees, onDelete }: EmployeeTableProps) {
  return (
    // Scrolls sideways on narrow screens. tabIndex lets keyboard users scroll it.
    <div className="overflow-x-auto" role="region" aria-label="Employees table" tabIndex={0}>
      <table className="w-full min-w-[820px] text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th scope="col" className={headerCell}>Employee</th>
            <th scope="col" className={headerCell}>Email</th>
            <th scope="col" className={headerCell}>Department</th>
            <th scope="col" className={headerCell}>Job Title</th>
            <th scope="col" className={headerCell}>Joining Date</th>
            <th scope="col" className={`${headerCell} text-right`}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {employees.map((employee) => (
            <tr key={employee.id} className="hover:bg-gray-50/70">
              <td className="px-4 py-3">
                <Link href={`/employees/${employee.id}`} className="flex items-center gap-3 font-medium hover:text-brand-700">
                  <span
                    aria-hidden="true"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-600"
                  >
                    {getInitials(employee.fullName)}
                  </span>
                  <span className="whitespace-nowrap">{employee.fullName}</span>
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-600">{employee.email}</td>
              <td className="px-4 py-3">
                <span className="inline-flex whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  {employee.department}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-700">{employee.jobTitle}</td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(employee.joiningDate)}</td>
              <td className="px-4 py-3 text-right">
                <RowActionsMenu employee={employee} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
