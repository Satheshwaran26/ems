import { isDepartment } from "@/types/employee";
import {
  createEmployee,
  DuplicateEmailError,
  listEmployees,
} from "@/lib/employee-service";
import { errorResponse, handleErrors, readJson } from "@/lib/utils";
import { validateEmployeeInput } from "@/lib/validations/employee-schema";

// GET /api/employees?search=&department=&page=&pageSize=&sort=recent|name
export async function GET(request: Request) {
  return handleErrors(request, async () => {
    const params = new URL(request.url).searchParams;
    const department = params.get("department") ?? "";

    const result = await listEmployees({
      search: params.get("search") ?? "",
      department: isDepartment(department) ? department : "",
      page: Number(params.get("page")) || 1,
      pageSize: Number(params.get("pageSize")) || 10,
      sort: params.get("sort") === "name" ? "name" : "recent",
    });

    return Response.json(result);
  });
}

// POST /api/employees
export async function POST(request: Request) {
  return handleErrors(request, async () => {
    const validation = validateEmployeeInput(await readJson(request));
    if (!validation.ok) {
      return errorResponse("Please fix the highlighted fields.", 400, validation.errors);
    }

    try {
      const data = await createEmployee(validation.value);
      return Response.json({ data }, { status: 201 });
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        return errorResponse(error.message, 409, { email: error.message });
      }
      throw error;
    }
  });
}
