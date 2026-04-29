export const csrfCookieName =
  process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || "pos_mans_session_csrf";

type EnsureCsrfTokenOptions = {
  forceRefresh?: boolean;
};

export function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split("; ");
  const match = cookies.find((entry) => entry.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export async function ensureCsrfToken(options: EnsureCsrfTokenOptions = {}) {
  const existing = readCookie(csrfCookieName);
  if (existing && !options.forceRefresh) {
    return existing;
  }

  const response = await fetch("/api/auth/csrf", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("ไม่สามารถเตรียมเซสชันของหน้านี้ได้ กรุณารีเฟรชแล้วลองใหม่");
  }

  const data = (await response.json()) as { csrfToken?: string };
  return data.csrfToken || readCookie(csrfCookieName) || null;
}

export async function fetchWithCsrfRetry(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = init.method?.toUpperCase() || "GET";
  const shouldAttachCsrf = !["GET", "HEAD", "OPTIONS"].includes(method);
  const token = shouldAttachCsrf ? await ensureCsrfToken() : null;
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("x-csrf-token", token);
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: init.credentials || "same-origin",
  });

  if (!shouldAttachCsrf || response.status !== 403) {
    return response;
  }

  const payload = (await response.clone().json().catch(() => null)) as { code?: string } | null;
  if (payload?.code !== "CSRF_MISMATCH") {
    return response;
  }

  const refreshedToken = await ensureCsrfToken({ forceRefresh: true });
  const retryHeaders = new Headers(init.headers);
  if (refreshedToken) {
    retryHeaders.set("x-csrf-token", refreshedToken);
  }

  return fetch(input, {
    ...init,
    headers: retryHeaders,
    credentials: init.credentials || "same-origin",
  });
}
