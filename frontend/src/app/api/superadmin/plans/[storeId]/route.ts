import { proxyBackendRoute } from "@/lib/proxy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;

  return proxyBackendRoute(request, `/api/superadmin/plans/${encodeURIComponent(storeId)}`, {
    method: "PATCH",
    csrf: true,
    contentType: true,
    refererPath: "/superadmin/plans",
    forwardBody: true,
  });
}

export async function GET() {
  return new Response("Method Not Allowed", { status: 405 });
}
