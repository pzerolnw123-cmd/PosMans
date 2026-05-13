import { notFound } from "next/navigation";
import { getOwnerPaymentSettings, getOwnerPlan, requireOwnerSession } from "@/lib/session";
import { OwnerWorkspace, type OwnerSectionKey } from "@/components/owner-workspace";

const validSections: OwnerSectionKey[] = ["sales", "payments", "receipts", "reports", "menu", "overview", "calculator", "profile", "plan", "line", "settings"];
const sectionsNeedingPaymentSettings = new Set<OwnerSectionKey>(["payments", "overview", "settings"]);

export default async function OwnerSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!validSections.includes(section as OwnerSectionKey)) {
    notFound();
  }

  const activeSection = section as OwnerSectionKey;
  const session = await requireOwnerSession();
  const paymentSettings = sectionsNeedingPaymentSettings.has(activeSection) ? await getOwnerPaymentSettings() : null;
  const ownerPlan = activeSection === "plan" ? await getOwnerPlan() : null;

  return <OwnerWorkspace session={session} paymentStore={paymentSettings?.store || null} ownerPlan={ownerPlan?.plan || null} activeSection={activeSection} />;
}
