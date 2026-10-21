import type { Metadata } from "next";
import { AddEmployeeButton } from "@/components/employees/employee-directory";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { RecentEmployees } from "@/components/dashboard/recent-employees";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your workforce">
        <AddEmployeeButton />
      </PageHeader>

      <div className="space-y-6">
        <DashboardStats />
        <RecentEmployees />
      </div>
    </>
  );
}
