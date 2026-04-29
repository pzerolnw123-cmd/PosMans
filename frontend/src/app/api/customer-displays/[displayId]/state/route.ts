import { proxyBackendRoute } from "@/lib/proxy";

export async function GET(request: Request, { params }: { params: Promise<{ displayId: string }> }) {
  const { displayId } = await params;
  return proxyBackendRoute(request, `/api/customer-displays/${encodeURIComponent(displayId)}/state`, {
    includeSearch: true,
    refererPath: "/display",
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ displayId: string }> }) {
  const { displayId } = await params;
  return proxyBackendRoute(request, `/api/customer-displays/${encodeURIComponent(displayId)}/state`, {
    method: "PATCH",
    csrf: true,
    contentType: true,
    refererPath: "/owner/payments",
    forwardBody: true,
  });
}
