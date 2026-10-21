import { Suspense } from "react";
import type { Metadata } from "next";
import { EditEmployee } from "@/components/employees/employee-directory";
import { PageHeader } from "@/components/layout/page-header";
import { Loading } from "@/components/ui/loading";

export const metadata: Metadata = { title: "Edit employee" };

export default function EditEmployeePage({ params }: PageProps<"/employees/[id]/edit">) {
  return (
    <>
      <PageHeader title="Edit employee" description="Update this employee's details" />
      <Suspense fallback={<Loading label="Loading employee..." />}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}

async function Editor({ params }: Pick<PageProps<"/employees/[id]/edit">, "params">) {
  const { id } = await params;
  return <EditEmployee id={id} />;
}
