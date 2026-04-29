import { backendResponse, buildBackendHeaders, proxyToBackend } from "@/lib/proxy";

export async function GET(request: Request, { params }: { params: Promise<{ displayId: string }> }) {
  const { displayId } = await params;
  const url = new URL(request.url);
  const response = await proxyToBackend(`/api/customer-displays/${encodeURIComponent(displayId)}/state${url.search}`, {
    method: "GET",
    headers: buildBackendHeaders(request, { refererPath: "/display" }),
  });

  return backendResponse(response);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ displayId: string }> }) {
  const { displayId } = await params;
  const body = await request.text();
  const response = await proxyToBackend(`/api/customer-displays/${encodeURIComponent(displayId)}/state`, {
    method: "PATCH",
    headers: buildBackendHeaders(request, { csrf: true, contentType: true, refererPath: "/owner/payments" }),
    body,
  });

  return backendResponse(response);
}
