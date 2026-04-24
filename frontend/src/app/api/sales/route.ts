import { backendResponse, buildBackendHeaders, proxyToBackend } from "@/lib/proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = await proxyToBackend(`/api/sales${url.search}`, {
    method: "GET",
    headers: buildBackendHeaders(request, { refererPath: "/owner/receipts" }),
  });

  return backendResponse(response);
}

export async function POST(request: Request) {
  const body = await request.text();
  const response = await proxyToBackend("/api/sales", {
    method: "POST",
    headers: buildBackendHeaders(request, { csrf: true, contentType: true, refererPath: "/owner/sales" }),
    body,
  });

  return backendResponse(response);
}
