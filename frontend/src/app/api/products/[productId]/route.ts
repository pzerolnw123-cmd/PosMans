import { NextResponse } from "next/server";
import { copyBackendCookies, proxyToBackend } from "@/lib/proxy";

type RouteContext = {
  params: Promise<{ productId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { productId } = await context.params;
  const body = await request.text();
  const response = await proxyToBackend(`/api/products/${productId}`, {
    method: "PATCH",
    headers: {
      "content-type": request.headers.get("content-type") || "application/json",
      "x-csrf-token": request.headers.get("x-csrf-token") || "",
      origin: request.headers.get("origin") || "http://localhost:3000",
      referer: request.headers.get("referer") || "http://localhost:3000/owner/menu",
    },
    body,
  });

  const text = await response.text();
  const headers = new Headers({
    "content-type": response.headers.get("content-type") || "application/json",
    "cache-control": response.headers.get("cache-control") || "no-store",
  });
  copyBackendCookies(response, headers);

  return new NextResponse(text, {
    status: response.status,
    headers,
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { productId } = await context.params;
  const response = await proxyToBackend(`/api/products/${productId}`, {
    method: "DELETE",
    headers: {
      "x-csrf-token": request.headers.get("x-csrf-token") || "",
      origin: request.headers.get("origin") || "http://localhost:3000",
      referer: request.headers.get("referer") || "http://localhost:3000/owner/menu",
    },
  });

  const headers = new Headers({
    "cache-control": response.headers.get("cache-control") || "no-store",
  });
  copyBackendCookies(response, headers);

  return new NextResponse(null, {
    status: response.status,
    headers,
  });
}
