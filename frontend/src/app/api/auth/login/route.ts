import { backendResponse, buildBackendHeaders, proxyToBackend } from "@/lib/proxy";

export async function POST(request: Request) {
  const body = await request.text();
  const response = await proxyToBackend("/api/auth/login", {
    method: "POST",
    headers: buildBackendHeaders(request, { csrf: true, contentType: true, refererPath: "/login" }),
    body,
  });

  return backendResponse(response);
}
