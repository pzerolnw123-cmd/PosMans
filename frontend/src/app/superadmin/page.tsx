import { requireSuperAdminSession } from "@/lib/session";
import { SuperAdminWorkspace } from "@/components/superadmin-workspace";

export default async function SuperAdminPage() {
  const session = await requireSuperAdminSession();

  return <SuperAdminWorkspace session={session} activeSection="overview" />;
}
