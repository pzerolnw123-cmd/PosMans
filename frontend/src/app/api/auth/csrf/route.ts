import { backendResponse, buildBackendHeaders, proxyToBackend } from "@/lib/proxy";

export async function GET(request: Request) {
  const response = await proxyToBackend("/api/auth/csrf", {
    method: "GET",
    headers: buildBackendHeaders(request, { refererPath: "/login" }),
  });

  return backendResponse(response);
}
