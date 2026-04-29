import { proxyBackendRoute } from "@/lib/proxy";

type RouteContext = {
  params: Promise<{ productId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { productId } = await context.params;
  return proxyBackendRoute(request, `/api/products/${productId}`, {
    method: "PATCH",
    csrf: true,
    contentType: true,
    refererPath: "/owner/menu",
    forwardBody: true,
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { productId } = await context.params;
  return proxyBackendRoute(request, `/api/products/${productId}`, {
    method: "DELETE",
    csrf: true,
    refererPath: "/owner/menu",
    empty: true,
  });
}
