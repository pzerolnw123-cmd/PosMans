import { NextResponse } from "next/server";
import { copyBackendCookies, proxyToBackend } from "@/lib/proxy";

export async function GET() {
  const response = await proxyToBackend("/api/auth/me");
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