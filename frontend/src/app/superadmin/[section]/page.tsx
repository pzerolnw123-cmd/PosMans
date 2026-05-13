import { notFound } from "next/navigation";
import { requireSuperAdminSession } from "@/lib/session";
import { SuperAdminWorkspace, type SuperAdminSectionKey } from "@/components/superadmin-workspace";
import { superAdminSectionKeys } from "@/lib/superadmin";

const validSections: SuperAdminSectionKey[] = superAdminSectionKeys.filter((section) => section !== "overview");

export default async function SuperAdminSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section } = await params;
  const resolvedSearchParams = await searchParams;

  if (!validSections.includes(section as SuperAdminSectionKey)) {
    notFound();
  }

  const session = await requireSuperAdminSession();

  return <SuperAdminWorkspace session={session} activeSection={section as SuperAdminSectionKey} searchParams={resolvedSearchParams} />;
}
