export const csrfCookieName =
  process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || "pos_mans_session_csrf";

export function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split("; ");
  const match = cookies.find((entry) => entry.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export async function ensureCsrfToken() {
  const existing = readCookie(csrfCookieName);
  if (existing) {
    return existing;
  }

  const response = await fetch("/api/auth/csrf", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to initialize CSRF token");
  }

  const data = (await response.json()) as { csrfToken?: string };
  return data.csrfToken || readCookie(csrfCookieName) || null;
}