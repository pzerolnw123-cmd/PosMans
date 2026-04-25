import { notFound } from "next/navigation";
import { getOwnerPaymentSettings, requireOwnerSession } from "@/lib/session";
import { OwnerWorkspace, type OwnerSectionKey } from "@/components/owner-workspace";

const validSections: OwnerSectionKey[] = ["sales", "payments", "receipts", "reports", "menu", "overview", "calculator", "settings"];

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
  const paymentSettings = await getOwnerPaymentSettings();

  return <OwnerWorkspace session={session} paymentStore={paymentSettings?.store || null} activeSection={section as OwnerSectionKey} />;
}
