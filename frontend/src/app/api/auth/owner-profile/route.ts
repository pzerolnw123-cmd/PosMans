import { NextResponse } from "next/server";
import { buildBackendHeaders, copyBackendCookies, proxyToBackend } from "@/lib/proxy";

export async function PATCH(request: Request) {
  const body = await request.text();
  const response = await proxyToBackend("/api/auth/owner-profile", {
    method: "PATCH",
    headers: buildBackendHeaders(request, { csrf: true, contentType: true, refererPath: "/owner/settings" }),
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
