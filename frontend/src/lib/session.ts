import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { backendUrl } from "@/lib/api";

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  platformRole: string;
  storeRole: string | null;
  storeId: string | null;
  store: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    logoUploadedKey?: string | null;
  } | null;
};

export type SessionPayload = {
  user: SessionUser;
  session: { expiresAt: string };
  csrfToken?: string;
};

const sessionCookieName = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME || "pos_mans_session";

export const getCurrentSession = cache(async () => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(sessionCookieName);

  // Avoid a backend roundtrip when the browser does not have a session cookie at all.
  if (!sessionCookie?.value) {
    return null;
  }

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const response = await fetch(`${backendUrl}/api/auth/me`, {
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<SessionPayload>;
});

export async function requireSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireOwnerSession() {
  const session = await requireSession();

  if (session.user.platformRole === "SUPER_ADMIN") {
    redirect("/superadmin");
  }

  if (session.user.storeRole !== "OWNER") {
    redirect("/login");
  }

  return session;
}

export async function requireSuperAdminSession() {
  const session = await requireSession();

  if (session.user.platformRole === "SUPER_ADMIN") {
    return session;
  }

  if (session.user.storeRole === "OWNER") {
    redirect("/owner/sales");
  }

  redirect("/login");
}
