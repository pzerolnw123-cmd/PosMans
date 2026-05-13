import { requireSuperAdminSession } from "@/lib/session";
import { SuperAdminWorkspace } from "@/components/superadmin-workspace";

export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSuperAdminSession();
  const resolvedSearchParams = await searchParams;

  return <SuperAdminWorkspace session={session} activeSection="overview" searchParams={resolvedSearchParams} />;
}
