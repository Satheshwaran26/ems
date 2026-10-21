"use client";

import { Building2, Clock, UserPlus, Users } from "lucide-react";
import { ErrorMessage } from "@/components/ui/error-message";
import { StatCard } from "@/components/dashboard/stat-card";
import { useDashboardStats } from "@/lib/hooks/use-employees";

/** The four summary cards. Numbers come from GET /api/dashboard/stats. */
export function DashboardStats() {
  const { data, error, retry } = useDashboardStats();

  if (error && !data) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <ErrorMessage message={error.message} onRetry={retry} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={Users} label="Total Employees" value={data?.totalEmployees} description="People in the directory" />
      <StatCard icon={Building2} label="Departments" value={data?.departmentCount} description="Teams in the organisation" />
      <StatCard
        icon={UserPlus}
        label="New Employees This Month"
        value={data?.newThisMonth}
        description="Joining date is this month"
      />
      <StatCard
        icon={Clock}
        label="Recently Added Employees"
        value={data?.recentlyAdded}
        description="Added in the last 7 days"
      />
    </div>
  );
}
