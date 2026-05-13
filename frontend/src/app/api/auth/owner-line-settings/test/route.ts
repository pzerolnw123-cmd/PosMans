import { proxyBackendRoute } from "@/lib/proxy";

export async function POST(request: Request) {
  return proxyBackendRoute(request, "/api/auth/owner-line-settings/test", {
    method: "POST",
    csrf: true,
    contentType: true,
    refererPath: "/owner/line",
    forwardBody: true,
  });
}
