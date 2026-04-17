import { requireOwnerSession } from "@/lib/session";
import { OwnerWorkspace } from "@/components/owner-workspace";

export default async function OwnerPage() {
  const session = await requireOwnerSession();

  return <OwnerWorkspace session={session} activeSection="settings" />;
}
