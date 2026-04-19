import { notFound } from "next/navigation";
import { requireOwnerSession } from "@/lib/session";
import { OwnerWorkspace, type OwnerSectionKey } from "@/components/owner-workspace";

const validSections: OwnerSectionKey[] = ["sales", "payments", "receipts", "reports", "menu", "overview", "calculator"];

export default async function OwnerSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!validSections.includes(section as OwnerSectionKey)) {
    notFound();
  }

  const session = await requireOwnerSession();

  return <OwnerWorkspace session={session} activeSection={section as OwnerSectionKey} />;
}
