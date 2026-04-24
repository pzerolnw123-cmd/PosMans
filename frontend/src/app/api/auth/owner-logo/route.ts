import { backendResponse, buildBackendHeaders, proxyToBackend } from "@/lib/proxy";

export async function PATCH(request: Request) {
  const body = await request.text();
  const response = await proxyToBackend("/api/auth/owner-logo", {
    method: "PATCH",
    headers: buildBackendHeaders(request, { csrf: true, contentType: true, refererPath: "/owner/settings" }),
    body,
  });

  return backendResponse(response);
}
