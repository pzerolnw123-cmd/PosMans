import { backendResponse, buildBackendHeaders, proxyToBackend } from "@/lib/proxy";

export async function DELETE(request: Request, { params }: { params: Promise<{ displayId: string }> }) {
  const { displayId } = await params;
  const response = await proxyToBackend(`/api/customer-displays/${encodeURIComponent(displayId)}`, {
    method: "DELETE",
    headers: buildBackendHeaders(request, { csrf: true, refererPath: "/owner/payments" }),
  });

  return backendResponse(response, { empty: true });
}
