import { NextResponse } from "next/server";
import { buildBackendHeaders, copyBackendCookies, proxyToBackend } from "@/lib/proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = await proxyToBackend(`/api/products${url.search}`, {
    method: "GET",
    headers: buildBackendHeaders(request, { refererPath: "/owner/menu" }),
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

export async function POST(request: Request) {
  const body = await request.text();
  const response = await proxyToBackend("/api/products", {
    method: "POST",
    headers: buildBackendHeaders(request, { csrf: true, contentType: true, refererPath: "/owner/menu" }),
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
