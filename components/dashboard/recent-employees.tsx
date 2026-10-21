import Link from "next/link";
import { EmployeeDirectory } from "@/components/employees/employee-directory";

/** The "Recent employees" table on the dashboard: the 5 newest records. */
export function RecentEmployees() {
  return (
    <EmployeeDirectory
      heading="Recent employees"
      pageSize={5}
      sort="recent"
      headerAction={
        <Link href="/employees" className="text-sm font-medium text-brand-700 hover:underline">
          View all
        </Link>
      }
    />
  );
}
