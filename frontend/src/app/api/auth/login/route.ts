import { backendAuthFetchTimeoutMs, proxyBackendRoute } from "@/lib/proxy";

export async function POST(request: Request) {
  return proxyBackendRoute(request, "/api/auth/login", {
    method: "POST",
    csrf: true,
    contentType: true,
    refererPath: "/login",
    forwardBody: true,
    timeoutMs: backendAuthFetchTimeoutMs,
  });
}
