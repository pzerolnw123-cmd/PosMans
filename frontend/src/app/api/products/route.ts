import { proxyBackendRoute } from "@/lib/proxy";

export async function GET(request: Request) {
  return proxyBackendRoute(request, "/api/products", { includeSearch: true, refererPath: "/owner/menu" });
}

export async function POST(request: Request) {
  return proxyBackendRoute(request, "/api/products", {
    method: "POST",
    csrf: true,
    contentType: true,
    refererPath: "/owner/menu",
    forwardBody: true,
  });
}
