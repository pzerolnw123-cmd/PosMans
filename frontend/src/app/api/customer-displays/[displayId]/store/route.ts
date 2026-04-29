import { proxyBackendRoute } from "@/lib/proxy";

export async function GET(request: Request, { params }: { params: Promise<{ displayId: string }> }) {
  const { displayId } = await params;
  return proxyBackendRoute(request, `/api/customer-displays/${encodeURIComponent(displayId)}/store`, {
    includeSearch: true,
    refererPath: "/display",
  });
}
