import { proxyBackendRoute } from "@/lib/proxy";

export async function POST(request: Request) {
  return proxyBackendRoute(request, "/api/auth/setup-pin", {
    method: "POST",
    csrf: true,
    contentType: true,
    refererPath: "/login",
    forwardBody: true,
  });
}
