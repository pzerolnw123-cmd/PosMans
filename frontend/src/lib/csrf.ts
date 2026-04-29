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
