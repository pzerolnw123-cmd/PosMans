import { proxyBackendRoute } from "@/lib/proxy";

export async function GET(request: Request) {
  return proxyBackendRoute(request, "/api/auth/owner-plan", { refererPath: "/owner/plan" });
}
