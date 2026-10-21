import {
  deleteEmployee,
  DuplicateEmailError,
  getEmployee,
  updateEmployee,
} from "@/lib/employee-service";
import { errorResponse, handleErrors, readJson } from "@/lib/utils";
import { validateEmployeeInput } from "@/lib/validations/employee-schema";

const NOT_FOUND = "Employee not found.";

// GET /api/employees/[id]
export async function GET(request: Request, ctx: RouteContext<"/api/employees/[id]">) {
  return handleErrors(request, async () => {
    const { id } = await ctx.params;
    const data = await getEmployee(id);
    return data ? Response.json({ data }) : errorResponse(NOT_FOUND, 404);
  });
}

// PATCH /api/employees/[id]  (send only the fields you want to change)
export async function PATCH(request: Request, ctx: RouteContext<"/api/employees/[id]">) {
  return handleErrors(request, async () => {
    const { id } = await ctx.params;
    const existing = await getEmployee(id);
    if (!existing) return errorResponse(NOT_FOUND, 404);

    const changes = await readJson(request);
    if (typeof changes !== "object" || changes === null) {
      return errorResponse("Request body must be a JSON object.", 400);
    }

    // Merge the changes onto the current record, then validate the full result.
    const validation = validateEmployeeInput({ ...existing, ...changes });
    if (!validation.ok) {
      return errorResponse("Please fix the highlighted fields.", 400, validation.errors);
    }

    try {
      const data = await updateEmployee(id, validation.value);
      return data ? Response.json({ data }) : errorResponse(NOT_FOUND, 404);
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        return errorResponse(error.message, 409, { email: error.message });
      }
      throw error;
    }
  });
}

// DELETE /api/employees/[id]
export async function DELETE(request: Request, ctx: RouteContext<"/api/employees/[id]">) {
  return handleErrors(request, async () => {
    const { id } = await ctx.params;
    const deleted = await deleteEmployee(id);
    return deleted ? Response.json({ success: true }) : errorResponse(NOT_FOUND, 404);
  });
}
