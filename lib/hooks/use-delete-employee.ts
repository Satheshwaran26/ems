"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { deleteEmployee } from "@/lib/api-client";
import type { Employee } from "@/types/employee";

/**
 * Everything needed for "delete with confirmation", shared by the employee
 * list and the employee details page:
 *
 *   const del = useDeleteEmployee();
 *   <button onClick={() => del.requestDelete(employee)} />
 *   {del.target && <DeleteEmployeeDialog ... onConfirm={del.confirmDelete} />}
 */
export function useDeleteEmployee(onDeleted?: () => void) {
  const { showToast } = useToast();
  const [target, setTarget] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function requestDelete(employee: Employee) {
    setError(null);
    setTarget(employee);
  }

  async function confirmDelete() {
    if (!target) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteEmployee(target.id); // also refreshes every list on screen
      showToast("success", `${target.fullName} was deleted.`);
      setTarget(null);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this employee.");
    } finally {
      setIsDeleting(false);
    }
  }

  return {
    target,
    isDeleting,
    error,
    requestDelete,
    confirmDelete,
    cancel: () => setTarget(null),
  };
}
