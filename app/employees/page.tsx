import { Suspense } from "react";
import type { Metadata } from "next";
import { AddEmployeeButton, EmployeeDirectory } from "@/components/employees/employee-directory";
import { PageHeader } from "@/components/layout/page-header";
import { Loading } from "@/components/ui/loading";
import { isDepartment } from "@/types/employee";

export const metadata: Metadata = { title: "Employees" };

export default function EmployeesPage({ searchParams }: PageProps<"/employees">) {
  return (
    <>
      <PageHeader title="Employees" description="Search, filter and manage everyone in your organisation">
        <AddEmployeeButton />
      </PageHeader>

      {/* searchParams is only known per request, so it is read inside Suspense */}
      <Suspense fallback={<Loading label="Loading employees..." />}>
        <Directory searchParams={searchParams} />
      </Suspense>
    </>
  );
}

// Reads ?search= and ?department= from the URL (the top bar search uses ?search=).
async function Directory({ searchParams }: Pick<PageProps<"/employees">, "searchParams">) {
  const { search, department } = await searchParams;
  const initialSearch = typeof search === "string" ? search : "";
  const initialDepartment = typeof department === "string" && isDepartment(department) ? department : "";

  return (
    <EmployeeDirectory
      // A new key resets the filters when the URL changes
      key={`${initialSearch}|${initialDepartment}`}
      heading="All employees"
      initialSearch={initialSearch}
      initialDepartment={initialDepartment}
    />
  );
}
