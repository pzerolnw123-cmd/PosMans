import { proxyBackendRoute } from "@/lib/proxy";

export async function GET(request: Request) {
  return proxyBackendRoute(request, "/api/auth/owner-line-settings", { refererPath: "/owner/line" });
}

export async function PATCH(request: Request) {
  return proxyBackendRoute(request, "/api/auth/owner-line-settings", {
    method: "PATCH",
    csrf: true,
    contentType: true,
    refererPath: "/owner/line",
    forwardBody: true,
  });
}
