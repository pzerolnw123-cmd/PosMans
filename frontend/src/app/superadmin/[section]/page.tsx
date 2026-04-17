import { notFound } from "next/navigation";
import { requireSuperAdminSession } from "@/lib/session";
import { SuperAdminWorkspace, type SuperAdminSectionKey } from "@/components/superadmin-workspace";

const validSections: SuperAdminSectionKey[] = ["stores", "owners", "security", "audit", "system"];

export default async function SuperAdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!validSections.includes(section as SuperAdminSectionKey)) {
    notFound();
  }

  const session = await requireSuperAdminSession();

  return <SuperAdminWorkspace session={session} activeSection={section as SuperAdminSectionKey} />;
}
