import { backendUrl } from "@/lib/api";
import { cookies } from "next/headers";

export type SuperAdminSectionKey =
  | "overview"
  | "stores"
  | "owners"
  | "user-management"
  | "plans"
  | "plan-management"
  | "sales"
  | "products"
  | "displays"
  | "line"
  | "uploads"
  | "security"
  | "audit"
  | "system";

export type SuperAdminStore = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  isActive: boolean;
  paymentReady: boolean;
  lineEnabled: boolean;
  lineLastSuccessAt: string | null;
  lineLastError: string | null;
  planTier: string;
  planStatus: string;
  planExpiresAt: string | null;
  ownerCount: number;
  productCount: number;
  saleCount: number;
  displayCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SuperAdminUser = {
  id: string;
  username: string;
  displayName: string;
  platformRole: string;
  storeRole: string | null;
  ownerTheme: string;
  isActive: boolean;
  hasPin: boolean;
  store: {
    id: string;
    slug: string;
    name: string;
    isActive: boolean;
    plan: { id: string; tier: string; status: string; expiresAt: string | null; lockVersion: number } | null;
  } | null;
  sessionCount: number;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SuperAdminAuditLog = {
  id: string;
  action: string;
  status: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  actor: {
    id: string;
    username: string;
    displayName: string;
    platformRole: string;
    storeRole: string | null;
  } | null;
  createdAt: string | null;
};

export type SuperAdminPayload = {
  summary?: Record<string, number | string>;
  storesNeedingAttention?: SuperAdminStore[];
  recentAuditLogs?: SuperAdminAuditLog[];
  stores?: SuperAdminStore[];
  owners?: SuperAdminUser[];
  ownerStoreOptions?: Array<{ id: string; slug: string; name: string; isActive: boolean }>;
  plans?: Array<{
    id: string;
    tier: string;
    status: string;
    expiresAt: string | null;
    lockVersion: number;
    store: { id: string; slug: string; name: string; isActive: boolean };
    createdAt: string | null;
    updatedAt: string | null;
  }>;
  usages?: Array<{
    id: string;
    period: string;
    paymentConfirmCount: number;
    store: { id: string; slug: string; name: string; isActive: boolean };
    createdAt: string | null;
    updatedAt: string | null;
  }>;
  byPaymentMethod?: Array<{ paymentMethod: string; total: number; count: number }>;
  recentSales?: Array<{
    id: string;
    code: string;
    status: string;
    paymentMethod: string;
    total: number;
    createdAt: string | null;
    store: { id: string; slug: string; name: string } | null;
    createdBy: { id: string; username: string; displayName: string } | null;
  }>;
  lowStock?: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
    status: string;
    stockQuantity: number;
    lowStockThreshold: number;
    store: { id: string; slug: string; name: string; isActive: boolean };
    updatedAt: string | null;
  }>;
  recentProducts?: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
    status: string;
    trackStock: boolean;
    stockQuantity: number;
    store: { id: string; slug: string; name: string; isActive: boolean };
    updatedAt: string | null;
  }>;
  displays?: Array<{
    id: string;
    name: string;
    status: string;
    amount: number;
    paymentMethod: string | null;
    saleCode: string | null;
    store: { id: string; slug: string; name: string; isActive: boolean };
    lastSeenAt: string | null;
    expiresAt: string | null;
    revokedAt: string | null;
    updatedAt: string | null;
  }>;
  integrations?: Array<{
    id: string;
    enabled: boolean;
    notifyOnSalePaid: boolean;
    recipientType: string;
    hasRecipient: boolean;
    hasChannelAccessToken: boolean;
    channelAccessTokenHint: string | null;
    lastTestedAt: string | null;
    lastSuccessAt: string | null;
    lastError: string | null;
    store: { id: string; slug: string; name: string; isActive: boolean };
    updatedAt: string | null;
  }>;
  productImages?: Array<{
    id: string;
    code: string;
    name: string;
    uploadedKey: string;
    imageUrl: string;
    store: { id: string; slug: string; name: string; isActive: boolean };
    updatedAt: string | null;
  }>;
  recentPolicies?: SuperAdminAuditLog[];
  events?: SuperAdminAuditLog[];
  logs?: SuperAdminAuditLog[];
  health?: Record<string, string>;
  counts?: Record<string, number>;
  retention?: { oldestAuditLogAt: string | null };
  error?: string;
};

const endpointBySection: Record<SuperAdminSectionKey, string> = {
  overview: "/api/superadmin/overview",
  stores: "/api/superadmin/stores",
  owners: "/api/superadmin/owners",
  "user-management": "/api/superadmin/owners",
  plans: "/api/superadmin/plans",
  "plan-management": "/api/superadmin/plans",
  sales: "/api/superadmin/sales",
  products: "/api/superadmin/products",
  displays: "/api/superadmin/displays",
  line: "/api/superadmin/line",
  uploads: "/api/superadmin/uploads",
  security: "/api/superadmin/security",
  audit: "/api/superadmin/audit",
  system: "/api/superadmin/system",
};

export const superAdminSectionKeys = Object.keys(endpointBySection) as SuperAdminSectionKey[];

export async function fetchSuperAdminSection(section: SuperAdminSectionKey): Promise<SuperAdminPayload> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  try {
    const response = await fetch(`${backendUrl}${endpointBySection[section]}`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });

    const payload = (await response.json()) as SuperAdminPayload;
    if (!response.ok) {
      return { error: payload.error || "Superadmin data is not available right now." };
    }

    return payload;
  } catch {
    return { error: "Backend connection was interrupted. Superadmin data could not be loaded." };
  }
}
