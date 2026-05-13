import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { backendUrl } from "@/lib/api";

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  ownerTheme?: "violet" | "light" | "dark" | "mono" | "green_white" | "orange_pink";
  platformRole: string;
  storeRole: string | null;
  storeId: string | null;
  store: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    logoUploadedKey?: string | null;
    promptPayEnabled?: boolean;
    promptPayRecipientType?: "MOBILE" | "NATIONAL_ID" | "TAX_ID" | "STATIC_QR" | "BANK_ACCOUNT";
    promptPayId?: string | null;
    promptPayMobileId?: string | null;
    promptPayNationalId?: string | null;
    promptPayTaxId?: string | null;
    bankName?: string | null;
    bankAccountName?: string | null;
    bankAccountNumber?: string | null;
    paymentQrImageUrl?: string | null;
    paymentQrUploadedKey?: string | null;
  } | null;
};

export type SessionPayload = {
  user: SessionUser;
  session: { expiresAt: string };
  csrfToken?: string;
};

export type OwnerPaymentSettingsPayload = {
  store: NonNullable<SessionUser["store"]>;
};

export type OwnerPlanPayload = {
  plan: {
    plan: "START" | "PLUS";
    status: "ACTIVE" | "PAST_DUE" | "CANCELED";
    period: string;
    limits: {
      paymentConfirmationsPerMonth: number | null;
      products: number | null;
      stockQuantityTotal: number | null;
    };
    usage: {
      paymentConfirmationsThisMonth: number;
      products: number;
      stockQuantityTotal: number;
    };
  };
};

const sessionCookieName = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME || "pos_mans_session";

async function fetchBackendJson<T>(url: string, init: RequestInit) {
  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      return null;
    }

    return response.json() as Promise<T>;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      return null;
    }

    return response.json() as Promise<T>;
  } catch {
    return null;
  }
}

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

  return fetchBackendJson<SessionPayload>(`${backendUrl}/api/auth/me`, {
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  });
});

export const getOwnerPaymentSettings = cache(async () => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(sessionCookieName);

  if (!sessionCookie?.value) {
    return null;
  }

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  return fetchBackendJson<OwnerPaymentSettingsPayload>(`${backendUrl}/api/auth/owner-payment-settings`, {
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  });
});

export const getOwnerPlan = cache(async () => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(sessionCookieName);

  if (!sessionCookie?.value) {
    return null;
  }

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  return fetchBackendJson<OwnerPlanPayload>(`${backendUrl}/api/auth/owner-plan`, {
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  });
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
