"use client";

import { fetchDashboardStats, fetchEmployee, fetchEmployees } from "@/lib/api-client";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import type { EmployeeListQuery } from "@/types/employee";

export function useEmployees(query: EmployeeListQuery) {
  const key = JSON.stringify(query);
  return useAsyncData(`employees:${key}`, () => fetchEmployees(query), {
    keepPreviousData: true,
  });
}

export function useEmployee(id: string) {
  return useAsyncData(`employee:${id}`, () => fetchEmployee(id));
}

export function useDashboardStats() {
  return useAsyncData("dashboard-stats", fetchDashboardStats);
}
