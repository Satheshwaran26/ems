import { handleErrors } from "@/lib/utils";
import { getDashboardStats } from "@/lib/employee-service";

// GET /api/dashboard/stats
export async function GET(request: Request) {
  return handleErrors(request, async () => {
    const data = await getDashboardStats();
    return Response.json({ data });
  });
}
