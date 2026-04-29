import { proxyBackendRoute } from "@/lib/proxy";

type RouteContext = {
  params: Promise<{ saleId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { saleId } = await context.params;
  return proxyBackendRoute(request, `/api/sales/${saleId}`, { refererPath: "/owner/receipts" });
}
