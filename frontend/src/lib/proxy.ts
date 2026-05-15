import { backendUrl } from "@/lib/api";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
const frontendOrigin = new URL(frontendUrl).origin;
const backendFetchTimeoutMs = Number(process.env.BACKEND_FETCH_TIMEOUT_MS || 8000);

async function fetchBackendWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), backendFetchTimeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function proxyToBackend(path: string, init?: RequestInit) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const headers = new Headers(init?.headers);
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  try {
    return await fetchBackendWithTimeout(`${backendUrl}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Backend connection was interrupted. Please try again.", code: "BACKEND_UNAVAILABLE" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}

export function buildBackendHeaders(
  request: Request,
  {
    csrf = false,
    contentType = false,
    refererPath = "/",
  }: {
    csrf?: boolean;
    contentType?: boolean;
    refererPath?: string;
  } = {},
) {
  const headers = new Headers();
  const requestOrigin = request.headers.get("origin");
  const requestReferer = request.headers.get("referer");

  if (contentType) {
    headers.set("content-type", request.headers.get("content-type") || "application/json");
  }

  if (csrf) {
    headers.set("x-csrf-token", request.headers.get("x-csrf-token") || "");
  }

  headers.set("origin", requestOrigin || frontendOrigin);
  headers.set("referer", requestReferer || new URL(refererPath, frontendOrigin).toString());

  return headers;
}

export function copyBackendCookies(from: Response, to: Headers) {
  const getSetCookie = (from.headers).getSetCookie?.bind(from.headers);
  const cookies = getSetCookie ? getSetCookie() : [];

  if (cookies.length > 0) {
    cookies.forEach((cookie) => to.append("set-cookie", cookie));
    return;
  }

  const fallback = from.headers.get("set-cookie");
  if (fallback) {
    to.set("set-cookie", fallback);
  }
}

export async function backendResponse(response: Response, { empty = false }: { empty?: boolean } = {}) {
  const shouldReturnEmptyBody = empty && response.status === 204;
  const headers = new Headers({
    "cache-control": response.headers.get("cache-control") || "no-store",
  });

  if (!shouldReturnEmptyBody) {
    headers.set("content-type", response.headers.get("content-type") || "application/json");
  }

  copyBackendCookies(response, headers);

  return new NextResponse(shouldReturnEmptyBody ? null : await response.text(), {
    status: response.status,
    headers,
  });
}

export async function proxyBackendRoute(
  request: Request,
  path: string,
  {
    method = "GET",
    csrf = false,
    contentType = false,
    refererPath = "/",
    includeSearch = false,
    forwardBody = false,
    empty = false,
  }: {
    method?: string;
    csrf?: boolean;
    contentType?: boolean;
    refererPath?: string;
    includeSearch?: boolean;
    forwardBody?: boolean;
    empty?: boolean;
  } = {},
) {
  const url = new URL(request.url);
  const response = await proxyToBackend(`${path}${includeSearch ? url.search : ""}`, {
    method,
    headers: buildBackendHeaders(request, { csrf, contentType, refererPath }),
    ...(forwardBody ? { body: await request.text() } : {}),
  });

  return backendResponse(response, { empty });
}
