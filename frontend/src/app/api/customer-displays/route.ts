import { backendResponse, buildBackendHeaders, proxyToBackend } from "@/lib/proxy";

export async function GET(request: Request) {
  const response = await proxyToBackend("/api/customer-displays", {
    method: "GET",
    headers: buildBackendHeaders(request, { refererPath: "/owner/payments" }),
  });

  return backendResponse(response);
}

export async function POST(request: Request) {
  const body = await request.text();
  const response = await proxyToBackend("/api/customer-displays", {
    method: "POST",
    headers: buildBackendHeaders(request, { csrf: true, contentType: true, refererPath: "/owner/payments" }),
    body,
  });

  return backendResponse(response);
}
