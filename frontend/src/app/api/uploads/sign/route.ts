import { proxyBackendRoute } from "@/lib/proxy";

export async function POST(request: Request) {
  return proxyBackendRoute(request, "/api/uploads/sign", {
    method: "POST",
    csrf: true,
    contentType: true,
    refererPath: "/owner",
    forwardBody: true,
  });
}
