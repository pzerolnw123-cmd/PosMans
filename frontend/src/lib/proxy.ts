import { backendUrl } from "@/lib/api";
import { cookies } from "next/headers";

const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
const frontendOrigin = new URL(frontendUrl).origin;

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

  return fetch(`${backendUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
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
