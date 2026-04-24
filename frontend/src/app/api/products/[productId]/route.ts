import { backendResponse, buildBackendHeaders, proxyToBackend } from "@/lib/proxy";

type RouteContext = {
  params: Promise<{ productId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { productId } = await context.params;
  const body = await request.text();
  const response = await proxyToBackend(`/api/products/${productId}`, {
    method: "PATCH",
    headers: buildBackendHeaders(request, { csrf: true, contentType: true, refererPath: "/owner/menu" }),
    body,
  });

  return backendResponse(response);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { productId } = await context.params;
  const response = await proxyToBackend(`/api/products/${productId}`, {
    method: "DELETE",
    headers: buildBackendHeaders(request, { csrf: true, refererPath: "/owner/menu" }),
  });

  return backendResponse(response, { empty: true });
}
