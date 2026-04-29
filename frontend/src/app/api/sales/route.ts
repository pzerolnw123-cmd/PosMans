import { proxyBackendRoute } from "@/lib/proxy";

export async function GET(request: Request) {
  return proxyBackendRoute(request, "/api/sales", { includeSearch: true, refererPath: "/owner/receipts" });
}

export async function POST(request: Request) {
  return proxyBackendRoute(request, "/api/sales", {
    method: "POST",
    csrf: true,
    contentType: true,
    refererPath: "/owner/sales",
    forwardBody: true,
  });
}
