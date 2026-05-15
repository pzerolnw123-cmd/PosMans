import { backendUrl } from "@/lib/api";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
const frontendOrigin = new URL(frontendUrl).origin;
const backendFetchTimeoutMs = parseTimeoutMs(process.env.BACKEND_FETCH_TIMEOUT_MS, 8000);
export const backendAuthFetchTimeoutMs = parseTimeoutMs(
  process.env.BACKEND_AUTH_FETCH_TIMEOUT_MS,
  Math.max(backendFetchTimeoutMs, 20000),
);

function parseTimeoutMs(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function sanitizeProxyPath(path: string) {
  try {
    const url = new URL(path, "http://internal.local");
    for (const param of ["token", "controlToken", "csrfToken", "password", "pin"]) {
      if (url.searchParams.has(param)) {
        url.searchParams.set(param, "redacted");
      }
    }
    return `${url.pathname}${url.search}`;
  } catch {
    const queryStart = path.indexOf("?");
    return queryStart === -1 ? path : path.slice(0, queryStart);
  }
}

async function fetchBackendWithTimeout(url: string, init: RequestInit, timeoutMs = backendFetchTimeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function proxyToBackend(path: string, init?: RequestInit, { timeoutMs = backendFetchTimeoutMs }: { timeoutMs?: number } = {}) {
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
    }, timeoutMs);
  } catch (error) {
    const timedOut = isAbortError(error);
    const code = timedOut ? "BACKEND_TIMEOUT" : "BACKEND_UNAVAILABLE";
    if (process.env.NODE_ENV === "production") {
      console.error("[backendProxy] Backend request failed", {
        code,
        method: init?.method || "GET",
        path: sanitizeProxyPath(path),
        timeoutMs,
      });
    }

    return NextResponse.json(
      {
        error: timedOut
          ? "Backend request timed out. Please try again."
          : "Backend connection was interrupted. Please try again.",
        code,
      },
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
    timeoutMs = backendFetchTimeoutMs,
  }: {
    method?: string;
    csrf?: boolean;
    contentType?: boolean;
    refererPath?: string;
    includeSearch?: boolean;
    forwardBody?: boolean;
    empty?: boolean;
    timeoutMs?: number;
  } = {},
) {
  const url = new URL(request.url);
  const response = await proxyToBackend(`${path}${includeSearch ? url.search : ""}`, {
    method,
    headers: buildBackendHeaders(request, { csrf, contentType, refererPath }),
    ...(forwardBody ? { body: await request.text() } : {}),
  }, { timeoutMs });

  return backendResponse(response, { empty });
}
