import { Suspense } from "react";
import type { Metadata } from "next";
import { EmployeeDetails } from "@/components/employees/employee-details";
import { Loading } from "@/components/ui/loading";

export const metadata: Metadata = { title: "Employee details" };

export default function EmployeeDetailsPage({ params }: PageProps<"/employees/[id]">) {
  return (
    // params is only known per request, so it is read inside Suspense
    <Suspense fallback={<Loading label="Loading employee..." />}>
      <Details params={params} />
    </Suspense>
  );
}

async function Details({ params }: Pick<PageProps<"/employees/[id]">, "params">) {
  const { id } = await params;
  return <EmployeeDetails id={id} />;
}
