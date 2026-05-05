import { proxyBackendRoute } from "@/lib/proxy";

type RouteContext = {
  params: Promise<{ productId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { productId } = await context.params;
  const encodedProductId = encodeURIComponent(productId);
  return proxyBackendRoute(request, `/api/products/${encodedProductId}`, {
    method: "GET",
    refererPath: "/owner/menu",
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { productId } = await context.params;
  const encodedProductId = encodeURIComponent(productId);
  return proxyBackendRoute(request, `/api/products/${encodedProductId}`, {
    method: "PATCH",
    csrf: true,
    contentType: true,
    refererPath: "/owner/menu",
    forwardBody: true,
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { productId } = await context.params;
  const encodedProductId = encodeURIComponent(productId);
  return proxyBackendRoute(request, `/api/products/${encodedProductId}`, {
    method: "DELETE",
    csrf: true,
    refererPath: "/owner/menu",
    empty: true,
  });
}
