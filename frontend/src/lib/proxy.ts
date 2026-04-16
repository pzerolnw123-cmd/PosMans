import { backendUrl } from "@/lib/api";
import { cookies } from "next/headers";

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