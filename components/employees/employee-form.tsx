"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonStyles } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast-provider";
import { ApiError, createEmployee, updateEmployee } from "@/lib/api-client";
import { DEPARTMENTS, type Employee, type FieldErrors } from "@/types/employee";
import { validateEmployeeInput } from "@/lib/validations/employee-schema";

/** Form inputs are always strings, even salary and date. */
interface FormValues {
  fullName: string;
  email: string;
  department: string;
  jobTitle: string;
  salary: string;
  joiningDate: string;
}

const EMPTY_VALUES: FormValues = {
  fullName: "",
  email: "",
  department: "",
  jobTitle: "",
  salary: "",
  joiningDate: "",
};

function toFormValues(employee: Employee): FormValues {
  return {
    fullName: employee.fullName,
    email: employee.email,
    department: employee.department,
    jobTitle: employee.jobTitle,
    salary: String(employee.salary),
    joiningDate: employee.joiningDate,
  };
}

interface EmployeeFormProps {
  /** Pass an employee to edit; omit to create a new one. */
  employee?: Employee;
  /** Called after a successful save. When omitted, the edit form goes back to the details page. */
  onSuccess?: () => void;
  /** When given, the form is shown inside a popup: Cancel calls this and the card styling is dropped. */
  onCancel?: () => void;
}

export function EmployeeForm({ employee, onSuccess, onCancel }: EmployeeFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = Boolean(employee);

  const [values, setValues] = useState<FormValues>(employee ? toFormValues(employee) : EMPTY_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function setField(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    // Clear the error for a field as soon as the user starts fixing it.
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    // 1. Check the values in the browser first for instant feedback.
    const result = validateEmployeeInput(values);
    if (!result.ok) {
      setErrors(result.errors);
      focusFirstInvalidField(result.errors);
      return;
    }
    setErrors({});

    // 2. Send to the API. The server validates again.
    setIsSaving(true);
    try {
      if (employee) {
        await updateEmployee(employee.id, result.value);
        showToast("success", `${result.value.fullName} was updated.`);
        if (onSuccess) onSuccess();
        else router.push(`/employees/${employee.id}`);
      } else {
        const created = await createEmployee(result.value);
        showToast("success", `${created.fullName} was added.`);
        onSuccess?.(); // the list and dashboard refresh themselves
      }
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        setErrors(error.fieldErrors);
        focusFirstInvalidField(error.fieldErrors);
      }
      setFormError(error instanceof Error ? error.message : "Could not save the employee.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={onCancel ? "mt-5" : "max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm"}
    >
      {formError && (
        <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {formError}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            id="fullName"
            label="Full name"
            required
            autoFocus={Boolean(onCancel)}
            autoComplete="off"
            value={values.fullName}
            onChange={(event) => setField("fullName", event.target.value)}
            error={errors.fullName}
          />
        </div>
        <div className="sm:col-span-2">
          <TextField
            id="email"
            label="Email"
            type="email"
            required
            autoComplete="off"
            value={values.email}
            onChange={(event) => setField("email", event.target.value)}
            error={errors.email}
          />
        </div>
        <SelectField
          id="department"
          label="Department"
          required
          value={values.department}
          onChange={(event) => setField("department", event.target.value)}
          error={errors.department}
        >
          <option value="">Select a department</option>
          {DEPARTMENTS.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </SelectField>
        <TextField
          id="jobTitle"
          label="Job title"
          required
          autoComplete="off"
          value={values.jobTitle}
          onChange={(event) => setField("jobTitle", event.target.value)}
          error={errors.jobTitle}
        />
        <TextField
          id="salary"
          label="Annual salary (₹ INR)"
          type="number"
          inputMode="numeric"
          min={0}
          step={1000}
          required
          value={values.salary}
          onChange={(event) => setField("salary", event.target.value)}
          error={errors.salary}
        />
        <TextField
          id="joiningDate"
          label="Joining date"
          type="date"
          required
          value={values.joiningDate}
          onChange={(event) => setField("joiningDate", event.target.value)}
          error={errors.joiningDate}
        />
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
        ) : (
          <Link
            href={employee ? `/employees/${employee.id}` : "/employees"}
            className={buttonStyles({ variant: "secondary" })}
          >
            Cancel
          </Link>
        )}
        <Button type="submit" loading={isSaving}>
          {isEdit ? "Save changes" : "Save Employee"}
        </Button>
      </div>
    </form>
  );
}

/** Moves keyboard focus to the first field with an error. */
function focusFirstInvalidField(errors: FieldErrors) {
  const order = ["fullName", "email", "department", "jobTitle", "salary", "joiningDate"] as const;
  const first = order.find((field) => errors[field]);
  if (first) document.getElementById(first)?.focus();
}
