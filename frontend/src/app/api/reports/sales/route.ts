import { proxyBackendRoute } from "@/lib/proxy";

export async function GET(request: Request) {
  return proxyBackendRoute(request, "/api/reports/sales", { includeSearch: true, refererPath: "/owner/reports" });
}
