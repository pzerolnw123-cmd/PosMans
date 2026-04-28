import { backendResponse, buildBackendHeaders, proxyToBackend } from "@/lib/proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = await proxyToBackend(`/api/reports/sales${url.search}`, {
    method: "GET",
    headers: buildBackendHeaders(request, { refererPath: "/owner/reports" }),
  });

  return backendResponse(response);
}
