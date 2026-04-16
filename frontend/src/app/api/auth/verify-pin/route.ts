import { NextResponse } from "next/server";
import { copyBackendCookies, proxyToBackend } from "@/lib/proxy";

export async function POST(request: Request) {
  const body = await request.text();
  const response = await proxyToBackend("/api/auth/verify-pin", {
    method: "POST",
    headers: {
      "content-type": request.headers.get("content-type") || "application/json",
      "x-csrf-token": request.headers.get("x-csrf-token") || "",
      origin: request.headers.get("origin") || "http://localhost:3000",
      referer: request.headers.get("referer") || "http://localhost:3000/login",
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
