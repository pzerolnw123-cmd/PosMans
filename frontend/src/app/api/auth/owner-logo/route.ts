import { proxyBackendRoute } from "@/lib/proxy";

export async function PATCH(request: Request) {
  return proxyBackendRoute(request, "/api/auth/owner-logo", {
    method: "PATCH",
    csrf: true,
    contentType: true,
    refererPath: "/owner/settings",
    forwardBody: true,
  });
}
