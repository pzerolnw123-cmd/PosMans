import { backendResponse, buildBackendHeaders, proxyToBackend } from "@/lib/proxy";

export async function POST(request: Request) {
  const body = await request.text();
  const response = await proxyToBackend("/api/uploads/sign", {
    method: "POST",
    headers: buildBackendHeaders(request, { csrf: true, contentType: true, refererPath: "/owner" }),
    body,
  });

  return backendResponse(response);
}
