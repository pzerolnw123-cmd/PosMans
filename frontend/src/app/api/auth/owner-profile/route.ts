import { proxyBackendRoute } from "@/lib/proxy";

export async function PATCH(request: Request) {
  return proxyBackendRoute(request, "/api/auth/owner-profile", {
    method: "PATCH",
    csrf: true,
    contentType: true,
    refererPath: "/owner/settings",
    forwardBody: true,
  });
}

export async function GET() {
  return new Response("Method Not Allowed", { status: 405 });
}
