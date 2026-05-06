import { proxyBackendRoute } from "@/lib/proxy";

export async function POST(request: Request, { params }: { params: Promise<{ displayId: string }> }) {
  const { displayId } = await params;
  return proxyBackendRoute(request, `/api/customer-displays/${encodeURIComponent(displayId)}/revoke`, {
    method: "POST",
    contentType: true,
    refererPath: "/login",
    forwardBody: true,
    empty: true,
  });
}
