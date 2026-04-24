import { backendResponse, buildBackendHeaders, proxyToBackend } from "@/lib/proxy";

type RouteContext = {
  params: Promise<{ saleId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { saleId } = await context.params;
  const response = await proxyToBackend(`/api/sales/${saleId}`, {
    method: "GET",
    headers: buildBackendHeaders(request, { refererPath: "/owner/receipts" }),
  });

  return backendResponse(response);
}
