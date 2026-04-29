import { proxyBackendRoute } from "@/lib/proxy";

export async function POST(request: Request) {
  return proxyBackendRoute(request, "/api/auth/logout", {
    method: "POST",
    csrf: true,
    refererPath: "/owner",
  });
}
