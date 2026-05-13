import type { ReactNode } from "react";
import Link from "next/link";
import type { SessionPayload } from "@/lib/session";
import {
  fetchSuperAdminSection,
  type SuperAdminAuditLog,
  type SuperAdminPayload,
  type SuperAdminSectionKey,
  type SuperAdminStore,
  type SuperAdminUser,
} from "@/lib/superadmin";
import { BackofficeShell, PanelCard } from "@/components/backoffice-shell";
import { LogoutButton } from "@/components/logout-button";
import { SuperAdminOwnersEditor, SuperAdminPlansEditor } from "@/components/superadmin-management-client";
import { SessionExpiryGuard } from "@/components/session-expiry-guard";
import { StatusPill } from "@/components/ui-primitives";

export type { SuperAdminSectionKey } from "@/lib/superadmin";

type SuperAdminSearchParams = Record<string, string | string[] | undefined>;

type SuperAdminWorkspaceProps = {
  session: SessionPayload;
  activeSection: SuperAdminSectionKey;
  searchParams?: SuperAdminSearchParams;
};

type SectionMeta = {
  label: string;
  href: string;
  eyebrow: string;
  title: string;
  description: string;
};

type TableColumn<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  priority?: "primary" | "secondary" | "desktop";
};

type PaginatedTableProps<T> = {
  rows: T[];
  columns: TableColumn<T>[];
  getRowKey: (row: T) => string;
  pageParam: string;
  searchParams: SuperAdminSearchParams;
  baseHref: string;
  emptyMessage?: string;
  pageSize?: number;
};

const sectionMeta: Record<SuperAdminSectionKey, SectionMeta> = {
  overview: {
    label: "ภาพรวม / Overview",
    href: "/superadmin",
    eyebrow: "Platform Control",
    title: "ภาพรวมระบบ",
    description: "สถานะรวมของร้าน บัญชี เซสชัน ยอดขาย และรายการที่ควรตรวจระดับ platform",
  },
  stores: {
    label: "ร้านค้า / Stores",
    href: "/superadmin/stores",
    eyebrow: "Tenant Directory",
    title: "ร้านค้าในระบบ",
    description: "ตรวจสถานะร้าน แผน การชำระเงิน LINE และการใช้งานหลักของแต่ละ tenant",
  },
  owners: {
    label: "เจ้าของร้าน / Owners",
    href: "/superadmin/owners",
    eyebrow: "Identity Control",
    title: "บัญชีเจ้าของร้าน",
    description: "ดูบัญชี owner การผูกร้าน PIN เซสชัน และสถานะใช้งาน",
  },
  "user-management": {
    label: "จัดการผู้ใช้",
    href: "/superadmin/user-management",
    eyebrow: "User Management",
    title: "จัดการข้อมูลผู้ใช้",
    description: "แก้ไข username, display name, ร้านที่ผูก และสถานะใช้งานของบัญชี owner",
  },
  plans: {
    label: "แผน / Plans",
    href: "/superadmin/plans",
    eyebrow: "Plan Governance",
    title: "แผนและโควตา",
    description: "ติดตาม tier, status, usage และ lock version ของแผนร้าน",
  },
  "plan-management": {
    label: "จัดการ Plan",
    href: "/superadmin/plan-management",
    eyebrow: "Plan Control",
    title: "จัดการ Plan ร้าน",
    description: "กำหนด plan, status, วันหมดอายุ และเพิ่มอายุการใช้งาน PLUS",
  },
  sales: {
    label: "ยอดขาย / Sales",
    href: "/superadmin/sales",
    eyebrow: "Sales Monitor",
    title: "ยอดขายข้ามร้าน",
    description: "มุมมองอ่านอย่างเดียวสำหรับยอดขายรวม วิธีชำระเงิน และบิลล่าสุด",
  },
  products: {
    label: "สินค้า / Products",
    href: "/superadmin/products",
    eyebrow: "Inventory Watch",
    title: "สินค้าและสต็อก",
    description: "ติดตามสินค้าล่าสุดและรายการสต็อกต่ำข้ามร้าน",
  },
  displays: {
    label: "จอลูกค้า / Displays",
    href: "/superadmin/displays",
    eyebrow: "Customer Display",
    title: "Customer display sessions",
    description: "ดูสถานะจอลูกค้า การหมดอายุ การ revoke และร้านที่ผูกอยู่",
  },
  line: {
    label: "LINE OA",
    href: "/superadmin/line",
    eyebrow: "LINE Operations",
    title: "LINE integrations",
    description: "ตรวจสถานะการตั้งค่า LINE โดยไม่เปิดเผย token เต็ม",
  },
  uploads: {
    label: "ไฟล์ / Uploads",
    href: "/superadmin/uploads",
    eyebrow: "Asset Control",
    title: "Uploads และ assets",
    description: "ดูการใช้ไฟล์รูปสินค้า โลโก้ QR และ upload policy ล่าสุด",
  },
  security: {
    label: "ความปลอดภัย / Security",
    href: "/superadmin/security",
    eyebrow: "Security",
    title: "ความปลอดภัย",
    description: "ติดตาม login failures, password changes, active sessions และ security events",
  },
  audit: {
    label: "Audit Log",
    href: "/superadmin/audit",
    eyebrow: "Audit Trail",
    title: "Audit log",
    description: "บันทึกเหตุการณ์สำคัญของระบบ แยกจากรายงานร้าน",
  },
  system: {
    label: "System",
    href: "/superadmin/system",
    eyebrow: "System Readiness",
    title: "System",
    description: "สถานะ readiness และตัวนับสำคัญระดับระบบ",
  },
};

const sectionOrder = Object.keys(sectionMeta) as SuperAdminSectionKey[];
const tablePageSize = 4;
const superAdminTitleClass = "my-2 text-[clamp(1.75rem,2.15vw,2.55rem)] leading-[1] tracking-[-0.05em]";

function formatNumber(value: number | string | undefined) {
  if (typeof value === "number") {
    return value.toLocaleString("th-TH");
  }

  return value || "0";
}

function formatBaht(value: number | string | undefined) {
  const amount = typeof value === "number" ? value : Number(value || 0);
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(amount);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "ยังไม่มีข้อมูล";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

function toneForState(enabled: boolean) {
  return enabled ? "success" : "ghost";
}

function getSearchParam(searchParams: SuperAdminSearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function getTablePage(searchParams: SuperAdminSearchParams, key: string) {
  const page = Number(getSearchParam(searchParams, key));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function buildPageHref(baseHref: string, searchParams: SuperAdminSearchParams, pageParam: string, page: number) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    const resolvedValue = Array.isArray(value) ? value[0] : value;
    if (resolvedValue && key !== pageParam) {
      params.set(key, resolvedValue);
    }
  });

  if (page > 1) {
    params.set(pageParam, String(page));
  }

  const query = params.toString();
  return query ? `${baseHref}?${query}` : baseHref;
}

function SectionGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 grid min-w-0 auto-rows-max grid-cols-1 items-start gap-3 [&>section]:self-start [&_section>div>div>h2]:!my-2 [&_section>div>div>h2]:!text-[clamp(1.45rem,1.75vw,2.15rem)] [&_section>div>div>h2]:!leading-none [&_section>div>div>h2]:!tracking-[-0.045em] max-[820px]:gap-3">
      {children}
    </div>
  );
}

function OverviewGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 grid min-w-0 auto-rows-max grid-cols-1 items-start gap-3 [&>section]:w-full [&>section]:self-start [&_section>div>div>h2]:!my-2 [&_section>div>div>h2]:!text-[clamp(1.45rem,1.75vw,2.15rem)] [&_section>div>div>h2]:!leading-none [&_section>div>div>h2]:!tracking-[-0.045em]">
      {children}
    </div>
  );
}

function UploadsGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 grid min-w-0 auto-rows-max grid-cols-1 items-start gap-3 [&>section]:self-start [&_section>div>div>h2]:!my-2 [&_section>div>div>h2]:!text-[clamp(1.32rem,1.55vw,1.9rem)] [&_section>div>div>h2]:!leading-none [&_section>div>div>h2]:!tracking-[-0.04em] max-[820px]:gap-3">
      {children}
    </div>
  );
}

function MetricGrid({ items }: { items: Array<{ label: string; value: ReactNode; detail?: string }> }) {
  return (
    <div className="grid min-w-0 grid-cols-3 gap-[10px] [@media(orientation:portrait)]:grid-cols-2 [@media(orientation:portrait)_and_(max-width:640px)]:grid-cols-1 max-[1180px]:grid-cols-2 max-[720px]:grid-cols-1">
      {items.map((item) => (
        <div key={item.label} className="grid min-h-[82px] min-w-0 content-center rounded-none border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
          <span className="min-w-0 whitespace-normal break-normal text-[0.82rem] leading-[1.25] text-[var(--foreground-soft)]">{item.label}</span>
          <strong className="mt-[6px] block min-w-0 whitespace-normal break-normal text-[1.3rem] leading-[1.05] tracking-[-0.04em]">{item.value}</strong>
          {item.detail ? <span className="mt-1 min-w-0 whitespace-normal break-normal text-[0.78rem] leading-[1.25] text-[var(--foreground-soft)]">{item.detail}</span> : null}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message = "ยังไม่มีข้อมูลสำหรับมุมมองนี้" }: { message?: string }) {
  return (
    <div className="rounded-none border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-5 text-[0.92rem] text-[var(--foreground-soft)]">
      {message}
    </div>
  );
}

function columnVisibilityClass(priority: TableColumn<unknown>["priority"]) {
  if (priority === "desktop") {
    return "max-[980px]:hidden";
  }

  if (priority === "secondary") {
    return "max-[720px]:hidden";
  }

  return "";
}

function PaginationLink({ href, disabled, children }: { href: string; disabled: boolean; children: ReactNode }) {
  const className =
    "inline-flex min-h-[38px] items-center justify-center rounded-none border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-[0.84rem] font-bold text-[var(--foreground)] transition hover:border-[var(--accent-border)]";

  if (disabled) {
    return (
      <span aria-disabled="true" className={`${className} pointer-events-none opacity-45`}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function PaginatedTable<T>({ rows, columns, getRowKey, pageParam, searchParams, baseHref, emptyMessage, pageSize = tablePageSize }: PaginatedTableProps<T>) {
  if (!rows.length) {
    return <EmptyState message={emptyMessage} />;
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(getTablePage(searchParams, pageParam), totalPages);
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const shouldShowPagination = totalPages > 1;

  return (
    <div className="grid min-w-0 gap-3">
      <div className="max-w-full overflow-hidden rounded-none border border-[var(--border)] bg-[var(--surface-muted)]">
        <table className="w-full table-fixed border-collapse text-left text-[0.82rem]">
          <thead className="bg-[var(--panel-subtle)] text-[0.72rem] uppercase tracking-[0.16em] text-[var(--eyebrow)]">
            <tr>
              {columns.map((column) => (
                <th key={column.header} className={`${columnVisibilityClass(column.priority)} border-b border-[var(--border)] px-3 py-2 font-bold ${column.className || ""}`.trim()}>
                  <span className="block truncate">{column.header}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={getRowKey(row)} className="border-b border-[var(--border-hairline)] last:border-b-0">
                {columns.map((column) => (
                  <td key={column.header} className={`${columnVisibilityClass(column.priority)} min-w-0 px-3 py-2.5 align-middle ${column.className || ""}`.trim()}>
                    <div className="min-w-0 whitespace-normal break-normal leading-[1.35]">{column.cell(row)}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shouldShowPagination ? (
        <div className="flex items-center justify-between gap-3 max-[560px]:grid max-[560px]:grid-cols-2">
          <PaginationLink href={buildPageHref(baseHref, searchParams, pageParam, page - 1)} disabled={page <= 1}>
            ย้อนกลับ
          </PaginationLink>
          <span className="text-center text-[0.82rem] text-[var(--foreground-soft)] max-[560px]:col-span-2 max-[560px]:row-start-1">
            หน้า {page} / {totalPages} · {rows.length.toLocaleString("th-TH")} รายการ
          </span>
          <PaginationLink href={buildPageHref(baseHref, searchParams, pageParam, page + 1)} disabled={page >= totalPages}>
            ถัดไป
          </PaginationLink>
        </div>
      ) : null}
    </div>
  );
}

function storeColumns(): TableColumn<SuperAdminStore>[] {
  return [
    {
      header: "Store",
      priority: "primary",
      cell: (store) => (
        <span className="block min-w-0">
          <strong className="block break-words">{store.name}</strong>
          <span className="block break-words text-[0.78rem] text-[var(--foreground-soft)]">{store.slug}</span>
        </span>
      ),
    },
    { header: "Products", className: "w-[105px]", priority: "secondary", cell: (store) => formatNumber(store.productCount) },
    {
      header: "Status",
      className: "w-[132px]",
      priority: "primary",
      cell: (store) => <StatusPill tone={toneForState(store.isActive)}>{store.isActive ? "Active" : "Inactive"}</StatusPill>,
    },
    { header: "Updated", className: "w-[150px]", priority: "secondary", cell: (store) => formatDateTime(store.updatedAt) },
  ];
}

function ownerColumns(): TableColumn<SuperAdminUser>[] {
  return [
    {
      header: "Owner",
      priority: "primary",
      cell: (owner) => (
        <span className="block min-w-0">
          <strong className="block break-words">{owner.displayName}</strong>
          <span className="block break-words text-[0.78rem] text-[var(--foreground-soft)]">{owner.username}</span>
        </span>
      ),
    },
    { header: "Store", priority: "secondary", cell: (owner) => (owner.store ? owner.store.name : "Unassigned") },
    { header: "Role", className: "w-[120px]", priority: "desktop", cell: (owner) => owner.platformRole },
    {
      header: "Status",
      className: "w-[132px]",
      priority: "primary",
      cell: (owner) => <StatusPill tone={toneForState(owner.isActive)}>{owner.isActive ? "Active" : "Inactive"}</StatusPill>,
    },
    { header: "PIN", className: "w-[86px]", priority: "desktop", cell: (owner) => <StatusPill tone={toneForState(owner.hasPin)}>{owner.hasPin ? "Yes" : "No"}</StatusPill> },
    { header: "Sessions", className: "w-[98px]", priority: "secondary", cell: (owner) => formatNumber(owner.sessionCount) },
    { header: "Last Login", className: "w-[150px]", priority: "desktop", cell: (owner) => formatDateTime(owner.lastLoginAt) },
  ];
}

function auditColumns(): TableColumn<SuperAdminAuditLog>[] {
  return [
    { header: "Action", className: "w-[34%]", priority: "primary", cell: (log) => log.action },
    { header: "Actor", className: "w-[26%]", priority: "secondary", cell: (log) => (log.actor ? log.actor.displayName : "System") },
    {
      header: "Status",
      className: "w-[116px]",
      priority: "primary",
      cell: (log) => <StatusPill tone={log.status === "success" ? "success" : "ghost"}>{log.status}</StatusPill>,
    },
    { header: "Created", className: "w-[150px]", priority: "secondary", cell: (log) => formatDateTime(log.createdAt) },
  ];
}

function renderOverview(data: SuperAdminPayload, searchParams: SuperAdminSearchParams) {
  const summary = data.summary || {};
  const stores = data.storesNeedingAttention || [];
  const logs = data.recentAuditLogs || [];

  return (
    <OverviewGrid>
      <PanelCard eyebrow="Core Metrics" title="ตัวชี้วัดระบบ" description="ภาพรวมล่าสุดจากฐานข้อมูลจริง" className="px-[18px] py-4">
        <MetricGrid
          items={[
            { label: "ร้านทั้งหมด", value: formatNumber(summary.totalStores), detail: `${formatNumber(summary.activeStores)} active` },
            { label: "เจ้าของร้าน", value: formatNumber(summary.ownerUsers), detail: `${formatNumber(summary.superAdmins)} superadmin` },
            { label: "Active sessions", value: formatNumber(summary.activeSessions) },
            { label: "ยอดขาย 24 ชม.", value: formatBaht(summary.sales24hTotal), detail: `${formatNumber(summary.sales24hCount)} บิล` },
            { label: "ยอดขาย 7 วัน", value: formatBaht(summary.sales7dTotal), detail: `${formatNumber(summary.sales7dCount)} บิล` },
            { label: "สต็อกต่ำ", value: formatNumber(summary.lowStockProducts), detail: `${formatNumber(summary.products)} products` },
          ]}
        />
      </PanelCard>

      <PanelCard eyebrow="Watch List" title="รายการที่ควรตรวจ" description="ร้านที่ inactive, ไม่มี owner active หรือ LINE มี error" className="px-[18px] py-4">
        <PaginatedTable rows={stores} columns={storeColumns()} getRowKey={(store) => store.id} pageParam="watchPage" searchParams={searchParams} baseHref="/superadmin" emptyMessage="ยังไม่มีร้านใน watch list" />
      </PanelCard>

      <PanelCard eyebrow="Audit" title="เหตุการณ์ล่าสุด" description="เหตุการณ์ระบบล่าสุดแบบย่อ" className="px-[18px] py-4">
        <PaginatedTable rows={logs} columns={auditColumns()} getRowKey={(log) => log.id} pageParam="auditPage" searchParams={searchParams} baseHref="/superadmin" />
      </PanelCard>
    </OverviewGrid>
  );
}

function renderStores(data: SuperAdminPayload, searchParams: SuperAdminSearchParams) {
  const stores = data.stores || [];
  return (
    <SectionGrid>
      <PanelCard eyebrow="Stores" title="รายชื่อร้าน" description="สถานะ tenant และ integration ต่อร้าน" className="px-[18px] py-4">
        <PaginatedTable rows={stores} columns={storeColumns()} getRowKey={(store) => store.id} pageParam="page" searchParams={searchParams} baseHref="/superadmin/stores" />
      </PanelCard>
    </SectionGrid>
  );
}

function renderOwners(data: SuperAdminPayload, searchParams: SuperAdminSearchParams) {
  const owners = data.owners || [];
  return (
    <SectionGrid>
      <PanelCard eyebrow="Owners" title="บัญชี owner" description="บัญชีที่ผูกกับร้านและสถานะ session" className="px-[18px] py-4">
        <PaginatedTable rows={owners} columns={ownerColumns()} getRowKey={(owner) => owner.id} pageParam="page" searchParams={searchParams} baseHref="/superadmin/owners" />
      </PanelCard>
    </SectionGrid>
  );
}

function renderUserManagement(data: SuperAdminPayload) {
  const owners = data.owners || [];
  return (
    <SectionGrid>
      <PanelCard eyebrow="Edit Users" title="แก้ไขผู้ใช้" description="ไม่แก้ password, PIN, platform role หรือการผูกร้านจากหน้านี้" className="px-[18px] py-4">
        {owners.length ? <SuperAdminOwnersEditor owners={owners} /> : <EmptyState />}
      </PanelCard>
    </SectionGrid>
  );
}

function renderPlans(data: SuperAdminPayload, searchParams: SuperAdminSearchParams) {
  const plans = data.plans || [];
  const usages = data.usages || [];
  return (
    <SectionGrid>
      <PanelCard eyebrow="Plans" title="แผนร้าน" description="tier, status และ lock version" className="px-[18px] py-4">
        <PaginatedTable
          rows={plans}
          columns={[
            { header: "Store", priority: "primary", cell: (plan) => plan.store.name },
            { header: "Tier", className: "w-[120px]", priority: "primary", cell: (plan) => <StatusPill>{plan.tier}</StatusPill> },
            { header: "Status", className: "w-[132px]", priority: "primary", cell: (plan) => <StatusPill tone={plan.status === "ACTIVE" ? "success" : "ghost"}>{plan.status}</StatusPill> },
            { header: "Expires", className: "w-[150px]", priority: "secondary", cell: (plan) => formatDateTime(plan.expiresAt) },
            { header: "Lock", className: "w-[90px]", priority: "secondary", cell: (plan) => plan.lockVersion },
            { header: "Updated", className: "w-[150px]", priority: "desktop", cell: (plan) => formatDateTime(plan.updatedAt) },
          ]}
          getRowKey={(plan) => plan.id}
          pageParam="plansPage"
          searchParams={searchParams}
          baseHref="/superadmin/plans"
        />
      </PanelCard>
      <PanelCard eyebrow="Usage" title="การใช้โควตา" description="จำนวน payment confirmation ต่อรอบ" className="px-[18px] py-4">
        <PaginatedTable
          rows={usages}
          columns={[
            { header: "Store", priority: "primary", cell: (usage) => usage.store.name },
            { header: "Period", className: "w-[150px]", priority: "secondary", cell: (usage) => usage.period },
            { header: "Confirmations", className: "w-[150px]", priority: "primary", cell: (usage) => formatNumber(usage.paymentConfirmCount) },
            { header: "Updated", className: "w-[150px]", priority: "desktop", cell: (usage) => formatDateTime(usage.updatedAt) },
          ]}
          getRowKey={(usage) => usage.id}
          pageParam="usagePage"
          searchParams={searchParams}
          baseHref="/superadmin/plans"
        />
      </PanelCard>
    </SectionGrid>
  );
}

function renderPlanManagement(data: SuperAdminPayload) {
  const plans = data.plans || [];
  return (
    <SectionGrid>
      <PanelCard eyebrow="Plan Control" title="กำหนด plan และวันหมดอายุ" description="PLUS สามารถเพิ่มอายุการใช้งานด้วยจำนวนวันได้" className="px-[18px] py-4">
        {plans.length ? <SuperAdminPlansEditor plans={plans} /> : <EmptyState />}
      </PanelCard>
    </SectionGrid>
  );
}

function renderSales(data: SuperAdminPayload, searchParams: SuperAdminSearchParams) {
  const summary = data.summary || {};
  const rows = data.byPaymentMethod || [];
  const sales = data.recentSales || [];
  return (
    <SectionGrid>
      <PanelCard eyebrow="30 Days" title="ยอดขายรวม" description="รวมเฉพาะบิล PAID" className="px-[18px] py-4">
        <MetricGrid
          items={[
            { label: "ยอดขาย", value: formatBaht(summary.sales30dTotal) },
            { label: "จำนวนบิล", value: formatNumber(summary.sales30dCount) },
            { label: "วิธีชำระเงิน", value: formatNumber(rows.length) },
          ]}
        />
      </PanelCard>
      <PanelCard eyebrow="Payment Method" title="สรุปวิธีชำระเงิน" description="ยอดรวมแยกตาม method" className="px-[18px] py-4">
        <PaginatedTable
          rows={rows}
          columns={[
            { header: "Method", priority: "primary", cell: (row) => row.paymentMethod },
            { header: "Total", priority: "primary", cell: (row) => formatBaht(row.total) },
            { header: "Bills", className: "w-[100px]", priority: "secondary", cell: (row) => formatNumber(row.count) },
          ]}
          getRowKey={(row) => row.paymentMethod}
          pageParam="methodPage"
          searchParams={searchParams}
          baseHref="/superadmin/sales"
        />
      </PanelCard>
      <PanelCard eyebrow="Latest Bills" title="บิลล่าสุด" description="อ่านอย่างเดียว ไม่แก้ไขบิลจาก superadmin" className="px-[18px] py-4">
        <PaginatedTable
          rows={sales}
          columns={[
            { header: "Code", priority: "primary", cell: (sale) => sale.code },
            { header: "Store", priority: "secondary", cell: (sale) => sale.store?.name || "Unknown store" },
            { header: "Method", className: "w-[130px]", priority: "desktop", cell: (sale) => sale.paymentMethod },
            { header: "Total", className: "w-[130px]", priority: "primary", cell: (sale) => formatBaht(sale.total) },
            { header: "Created", className: "w-[150px]", priority: "secondary", cell: (sale) => formatDateTime(sale.createdAt) },
          ]}
          getRowKey={(sale) => sale.id}
          pageParam="salesPage"
          searchParams={searchParams}
          baseHref="/superadmin/sales"
        />
      </PanelCard>
    </SectionGrid>
  );
}

function renderProducts(data: SuperAdminPayload, searchParams: SuperAdminSearchParams) {
  const summary = data.summary || {};
  const lowStock = data.lowStock || [];
  const recent = data.recentProducts || [];
  return (
    <SectionGrid>
      <PanelCard eyebrow="Inventory" title="ตัวชี้วัดสินค้า" description="ข้อมูลสินค้าข้ามร้าน" className="px-[18px] py-4">
        <MetricGrid
          items={[
            { label: "สินค้าทั้งหมด", value: formatNumber(summary.totalProducts) },
            { label: "สต็อกต่ำ", value: formatNumber(summary.lowStockCount) },
            { label: "รายการล่าสุด", value: formatNumber(recent.length) },
          ]}
        />
      </PanelCard>
      <PanelCard eyebrow="Low Stock" title="รายการสต็อกต่ำ" description="ใช้ threshold ปัจจุบันของระบบ monitor" className="px-[18px] py-4">
        <PaginatedTable
          rows={lowStock}
          columns={[
            { header: "Product", priority: "primary", cell: (product) => product.name },
            { header: "Store", priority: "secondary", cell: (product) => product.store.name },
            { header: "Stock", className: "w-[95px]", priority: "primary", cell: (product) => formatNumber(product.stockQuantity) },
            { header: "Updated", className: "w-[150px]", priority: "secondary", cell: (product) => formatDateTime(product.updatedAt) },
          ]}
          getRowKey={(product) => product.id}
          pageParam="page"
          searchParams={searchParams}
          baseHref="/superadmin/products"
          emptyMessage="ยังไม่มีสินค้าสต็อกต่ำ"
        />
      </PanelCard>
    </SectionGrid>
  );
}

function renderDisplays(data: SuperAdminPayload, searchParams: SuperAdminSearchParams) {
  const displays = data.displays || [];
  return (
    <SectionGrid>
      <PanelCard eyebrow="Sessions" title="จอลูกค้าทั้งหมด" description="ไม่มี public/control token ใน payload" className="px-[18px] py-4">
        <PaginatedTable
          rows={displays}
          columns={[
            { header: "Display", priority: "primary", cell: (display) => display.name },
            { header: "Store", priority: "secondary", cell: (display) => display.store.name },
            { header: "Status", className: "w-[132px]", priority: "primary", cell: (display) => <StatusPill tone={display.revokedAt ? "ghost" : "success"}>{display.revokedAt ? "Revoked" : display.status}</StatusPill> },
            { header: "Last Seen", className: "w-[150px]", priority: "secondary", cell: (display) => formatDateTime(display.lastSeenAt) },
          ]}
          getRowKey={(display) => display.id}
          pageParam="page"
          searchParams={searchParams}
          baseHref="/superadmin/displays"
        />
      </PanelCard>
    </SectionGrid>
  );
}

function renderLine(data: SuperAdminPayload, searchParams: SuperAdminSearchParams) {
  const integrations = data.integrations || [];
  return (
    <SectionGrid>
      <PanelCard eyebrow="LINE OA" title="Integrations" description="แสดงเฉพาะ hint และสถานะ ไม่ส่ง secret ไป frontend" className="px-[18px] py-4">
        <PaginatedTable
          rows={integrations}
          columns={[
            { header: "Store", priority: "primary", cell: (integration) => integration.store.name },
            { header: "Enabled", className: "w-[120px]", priority: "primary", cell: (integration) => <StatusPill tone={toneForState(integration.enabled)}>{integration.enabled ? "Enabled" : "Disabled"}</StatusPill> },
            { header: "Token", className: "w-[100px]", priority: "desktop", cell: (integration) => <StatusPill tone={toneForState(integration.hasChannelAccessToken)}>{integration.hasChannelAccessToken ? "Yes" : "No"}</StatusPill> },
            { header: "Recipient", className: "w-[112px]", priority: "secondary", cell: (integration) => <StatusPill tone={toneForState(integration.hasRecipient)}>{integration.hasRecipient ? "Yes" : "No"}</StatusPill> },
            { header: "Last Success", className: "w-[150px]", priority: "secondary", cell: (integration) => formatDateTime(integration.lastSuccessAt) },
            { header: "Error", priority: "desktop", cell: (integration) => integration.lastError || "none" },
          ]}
          getRowKey={(integration) => integration.id}
          pageParam="page"
          searchParams={searchParams}
          baseHref="/superadmin/line"
        />
      </PanelCard>
    </SectionGrid>
  );
}

function renderUploads(data: SuperAdminPayload, searchParams: SuperAdminSearchParams) {
  const summary = data.summary || {};
  const images = data.productImages || [];
  const policies = data.recentPolicies || [];
  return (
    <UploadsGrid>
      <PanelCard eyebrow="Assets" title="ตัวนับไฟล์" description="ข้อมูลจาก record ที่มี uploaded key" className="px-[18px] py-4">
        <MetricGrid
          items={[
            { label: "Store logos", value: formatNumber(summary.storeLogoCount) },
            { label: "Payment QR", value: formatNumber(summary.paymentQrCount) },
            { label: "Product images", value: formatNumber(summary.productImageCount) },
          ]}
        />
      </PanelCard>
      <PanelCard eyebrow="Product Images" title="รูปสินค้าล่าสุด" description="ใช้ตรวจ asset prefix ต่อร้าน" className="px-[18px] py-4">
        <PaginatedTable
          rows={images}
          columns={[
            { header: "Image", priority: "primary", cell: (image) => image.name },
            { header: "Store", priority: "secondary", cell: (image) => image.store.name },
            { header: "Updated", className: "w-[150px]", priority: "secondary", cell: (image) => formatDateTime(image.updatedAt) },
          ]}
          getRowKey={(image) => image.id}
          pageParam="imagesPage"
          searchParams={searchParams}
          baseHref="/superadmin/uploads"
        />
      </PanelCard>
      <PanelCard eyebrow="Policies" title="Upload policies ล่าสุด" description="เหตุการณ์ออก policy จาก audit log" className="col-span-2 px-[18px] py-4 max-[1180px]:col-span-1">
        <PaginatedTable rows={policies} columns={auditColumns()} getRowKey={(log) => log.id} pageParam="policyPage" searchParams={searchParams} baseHref="/superadmin/uploads" />
      </PanelCard>
    </UploadsGrid>
  );
}

function renderSecurity(data: SuperAdminPayload, searchParams: SuperAdminSearchParams) {
  const summary = data.summary || {};
  const events = data.events || [];
  return (
    <SectionGrid>
      <PanelCard eyebrow="Access Health" title="สถานะความปลอดภัย" description="ตัวเลขล่าสุดจาก session และ audit log" className="px-[18px] py-4">
        <MetricGrid
          items={[
            { label: "Login failed 24 ชม.", value: formatNumber(summary.failedLogins24h) },
            { label: "Password changes 24 ชม.", value: formatNumber(summary.passwordChanges24h) },
            { label: "Active sessions", value: formatNumber(summary.activeSessions) },
            { label: "Expiring sessions", value: formatNumber(summary.expiringSessions) },
          ]}
        />
      </PanelCard>
      <PanelCard eyebrow="Events" title="Security events" description="เหตุการณ์ auth ล่าสุด" className="px-[18px] py-4">
        <PaginatedTable rows={events} columns={auditColumns()} getRowKey={(log) => log.id} pageParam="page" searchParams={searchParams} baseHref="/superadmin/security" />
      </PanelCard>
    </SectionGrid>
  );
}

function renderAudit(data: SuperAdminPayload, searchParams: SuperAdminSearchParams) {
  const logs = data.logs || [];
  return (
    <SectionGrid>
      <PanelCard eyebrow="Audit Trail" title="เหตุการณ์ระบบ" description="เรียงจากล่าสุด" className="px-[18px] py-4">
        <PaginatedTable rows={logs} columns={auditColumns()} getRowKey={(log) => log.id} pageParam="page" searchParams={searchParams} baseHref="/superadmin/audit" />
      </PanelCard>
    </SectionGrid>
  );
}

function renderSystem(data: SuperAdminPayload) {
  const health = data.health || {};
  const counts = data.counts || {};
  return (
    <SectionGrid>
      <PanelCard eyebrow="Readiness" title="สถานะระบบ" description="ตรวจจาก backend endpoint และฐานข้อมูล" className="px-[18px] py-4">
        <MetricGrid
          items={Object.entries(health).map(([label, value]) => ({
            label,
            value,
          }))}
        />
      </PanelCard>
      <PanelCard eyebrow="Database" title="ตัวนับข้อมูล" description="จำนวน record สำคัญ" className="px-[18px] py-4">
        <MetricGrid
          items={Object.entries(counts).map(([label, value]) => ({
            label,
            value: formatNumber(value),
          }))}
        />
      </PanelCard>
    </SectionGrid>
  );
}

function renderScreen(activeSection: SuperAdminSectionKey, data: SuperAdminPayload, searchParams: SuperAdminSearchParams) {
  if (data.error) {
    return (
      <PanelCard eyebrow="Data Error" title="โหลดข้อมูลไม่ได้" description={data.error}>
        <div className="mt-4">
          <EmptyState message="ตรวจ backend connection หรือ session superadmin แล้วลองใหม่" />
        </div>
      </PanelCard>
    );
  }

  switch (activeSection) {
    case "overview":
      return renderOverview(data, searchParams);
    case "stores":
      return renderStores(data, searchParams);
    case "owners":
      return renderOwners(data, searchParams);
    case "user-management":
      return renderUserManagement(data);
    case "plans":
      return renderPlans(data, searchParams);
    case "plan-management":
      return renderPlanManagement(data);
    case "sales":
      return renderSales(data, searchParams);
    case "products":
      return renderProducts(data, searchParams);
    case "displays":
      return renderDisplays(data, searchParams);
    case "line":
      return renderLine(data, searchParams);
    case "uploads":
      return renderUploads(data, searchParams);
    case "security":
      return renderSecurity(data, searchParams);
    case "audit":
      return renderAudit(data, searchParams);
    case "system":
      return renderSystem(data);
  }
}

export async function SuperAdminWorkspace({ session, activeSection, searchParams = {} }: SuperAdminWorkspaceProps) {
  const displayName = session.user.displayName;
  const meta = sectionMeta[activeSection];
  const data = await fetchSuperAdminSection(activeSection);
  const systemScrollScopeClass =
    "[@media(orientation:portrait)]:!h-full [@media(orientation:portrait)]:!overflow-hidden max-[1180px]:!h-full max-[1180px]:!overflow-hidden [&>.workspace-main-scroll]:!h-full [&>.workspace-main-scroll]:!min-h-0 [&>.workspace-main-scroll]:!overflow-y-auto [&>.workspace-main-scroll]:!overflow-x-hidden";

  return (
    <main className="workspace-screen-shell fixed inset-0 h-dvh overflow-hidden">
      <div className="workspace-screen-frame mx-auto h-full w-[min(1700px,calc(100%-32px))] px-0 py-3 [@media(orientation:portrait)]:w-[min(100%-24px,100%)] [@media(orientation:portrait)]:py-3 [@media(orientation:portrait)_and_(max-width:720px)]:w-[min(100%-16px,100%)] [@media(orientation:portrait)_and_(max-width:720px)]:pt-2.5 max-[1180px]:w-[min(100%-24px,100%)] max-[1180px]:py-3 max-[820px]:w-[min(100%-16px,100%)] max-[720px]:pt-2.5">
        <BackofficeShell
          className={`workspace-screen-content h-[calc(100dvh-24px)] ${systemScrollScopeClass}`}
          brandName="POS MANS"
          brandSubtitle="ศูนย์ควบคุมระดับระบบสำหรับดูแลร้าน เจ้าของร้าน ความปลอดภัย audit และ readiness ของ platform"
          eyebrow="SUPERADMIN WORKSPACE"
          sidebarItems={sectionOrder.map((key) => ({
            label: sectionMeta[key].label,
            href: sectionMeta[key].href,
            active: key === activeSection,
          }))}
          profileName={displayName}
          profileSubtitle="Platform administrator"
          profileMeta="Root platform access"
          profileRole="SUPER ADMIN"
          profileStatus="ออนไลน์"
          profileAction={<LogoutButton />}
        >
          <SessionExpiryGuard initialExpiresAt={session.session.expiresAt} />
          <PanelCard
            eyebrow={meta.eyebrow}
            title={meta.title}
            description={meta.description}
            titleClassName={superAdminTitleClass}
            className="border-[var(--border-hairline)] bg-[color-mix(in_srgb,var(--surface)_76%,transparent)] px-5 py-4 shadow-none backdrop-blur-none"
            actions={<StatusPill tone="success">Protected</StatusPill>}
          >
            {renderScreen(activeSection, data, searchParams)}
          </PanelCard>
        </BackofficeShell>
      </div>
    </main>
  );
}
