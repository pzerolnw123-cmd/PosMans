import { CustomerDisplayClient } from "@/components/customer-display-client";

export default async function CustomerDisplayPage({
  params,
  searchParams,
}: {
  params: Promise<{ displayId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { displayId } = await params;
  const { token = "" } = await searchParams;

  return <CustomerDisplayClient displayId={displayId} token={token} />;
}
