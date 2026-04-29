import { proxyBackendRoute } from "@/lib/proxy";

export async function GET(request: Request) {
  return proxyBackendRoute(request, "/api/customer-displays", { refererPath: "/owner/payments" });
}

export async function POST(request: Request) {
  return proxyBackendRoute(request, "/api/customer-displays", {
    method: "POST",
    csrf: true,
    contentType: true,
    refererPath: "/owner/payments",
    forwardBody: true,
  });
}
