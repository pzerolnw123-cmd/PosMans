import { backendResponse, buildBackendHeaders, proxyToBackend } from "@/lib/proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = await proxyToBackend(`/api/products${url.search}`, {
    method: "GET",
    headers: buildBackendHeaders(request, { refererPath: "/owner/menu" }),
  });

  return backendResponse(response);
}

export async function POST(request: Request) {
  const body = await request.text();
  const response = await proxyToBackend("/api/products", {
    method: "POST",
    headers: buildBackendHeaders(request, { csrf: true, contentType: true, refererPath: "/owner/menu" }),
    body,
  });

  return backendResponse(response);
}
