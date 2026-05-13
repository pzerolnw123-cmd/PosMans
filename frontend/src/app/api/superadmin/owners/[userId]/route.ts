import { proxyBackendRoute } from "@/lib/proxy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;

  return proxyBackendRoute(request, `/api/superadmin/owners/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    csrf: true,
    contentType: true,
    refererPath: "/superadmin/owners",
    forwardBody: true,
  });
}

export async function GET() {
  return new Response("Method Not Allowed", { status: 405 });
}
