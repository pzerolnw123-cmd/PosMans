import { proxyBackendRoute } from "@/lib/proxy";

export async function DELETE(request: Request, { params }: { params: Promise<{ displayId: string }> }) {
  const { displayId } = await params;
  return proxyBackendRoute(request, `/api/customer-displays/${encodeURIComponent(displayId)}`, {
    method: "DELETE",
    csrf: true,
    refererPath: "/owner/payments",
    empty: true,
  });
}
