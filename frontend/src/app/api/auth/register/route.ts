import { proxyBackendRoute } from "@/lib/proxy";

export async function POST(request: Request) {
  return proxyBackendRoute(request, "/api/auth/register", {
    method: "POST",
    csrf: true,
    contentType: true,
    refererPath: "/register",
    forwardBody: true,
  });
}
