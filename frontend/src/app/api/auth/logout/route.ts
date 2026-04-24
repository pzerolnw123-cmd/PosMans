import { backendResponse, buildBackendHeaders, proxyToBackend } from "@/lib/proxy";

export async function POST(request: Request) {
  const response = await proxyToBackend("/api/auth/logout", {
    method: "POST",
    headers: buildBackendHeaders(request, { csrf: true, refererPath: "/owner" }),
  });

  return backendResponse(response);
}
