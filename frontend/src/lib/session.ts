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
  } | null;
};

export async function getCurrentSession() {
  const cookieStore = await cookies();
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

  return response.json() as Promise<{
    user: SessionUser;
    session: { expiresAt: string };
    csrfToken?: string;
  }>;
}

export async function requireSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}
