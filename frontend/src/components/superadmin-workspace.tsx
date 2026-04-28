import type { ReactNode } from "react";
import type { SessionPayload } from "@/lib/session";
import { BackofficeShell, PanelCard } from "@/components/backoffice-shell";
import { LogoutButton } from "@/components/logout-button";
import { StatusPill } from "@/components/ui-primitives";

export type SuperAdminSectionKey = "overview" | "stores" | "owners" | "security" | "audit" | "system";

type SuperAdminWorkspaceProps = {
  session: SessionPayload;
  activeSection: SuperAdminSectionKey;
};

const sectionMeta: Record<SuperAdminSectionKey, { label: string; href: string }> = {
  overview: { label: "ภาพรวมระบบ", href: "/superadmin" },
  stores: { label: "ร้านค้า", href: "/superadmin/stores" },
  owners: { label: "เจ้าของร้าน", href: "/superadmin/owners" },
  security: { label: "ความปลอดภัย", href: "/superadmin/security" },
  audit: { label: "Audit Log", href: "/superadmin/audit" },
  system: { label: "System", href: "/superadmin/system" },
};

function SectionGrid({ children }: { children: ReactNode }) {
  return <div className="mt-4 grid grid-cols-2 gap-[14px] max-[1180px]:grid-cols-1 max-[820px]:gap-4">{children}</div>;
}

function ThreeUpStats({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid grid-cols-3 gap-[10px] max-[1180px]:grid-cols-2 max-[720px]:grid-cols-1">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-[14px] border border-[var(--border)] [background:var(--panel-elevated)] p-[14px]"
        >
          <span className="text-[0.9rem] text-[var(--foreground-soft)]">{label}</span>
          <strong className="mt-[6px] block text-[1.28rem] leading-[1.05] tracking-[-0.04em]">{value}</strong>
        </div>
      ))}
    </div>
  );
}

function NoteStack({ items }: { items: string[] }) {
  return (
    <div className="grid gap-[10px]">
      {items.map((item) => (
        <div
          key={item}
          className="rounded-[14px] border border-[var(--border)] [background:var(--panel-elevated)] px-4 py-[14px] leading-[1.5] text-[0.9rem] text-[var(--foreground-soft)]"
        >
          {item}
        </div>
      ))}
    </div>
  );
}

function ListStack({ items }: { items: Array<{ title: string; subtitle: string; value: ReactNode }> }) {
  return (
    <div className="grid gap-[10px]">
      {items.map((item) => (
        <div
          key={`${item.title}-${item.subtitle}`}
          className="flex items-center justify-between gap-[14px] rounded-[14px] border border-[var(--border)] [background:var(--panel-elevated)] px-4 py-[14px]"
        >
          <div>
            <strong className="block text-[1.28rem] leading-[1.05] tracking-[-0.04em]">{item.title}</strong>
            <p className="mt-[6px] text-[0.9rem] text-[var(--foreground-soft)]">{item.subtitle}</p>
          </div>
          <div>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function renderSuperAdminScreen(activeSection: SuperAdminSectionKey) {
  const screens: Record<
    SuperAdminSectionKey,
    {
      eyebrow: string;
      title: string;
      description: string;
      actions?: ReactNode;
      body: ReactNode;
    }
  > = {
    overview: {
      eyebrow: "Platform Control",
      title: "ภาพรวมระดับระบบ",
      description: "พื้นที่นี้แยกจาก owner โดยตรง ใช้สำหรับดูสุขภาพของ platform, จำนวนร้าน, เจ้าของร้าน และความพร้อมของระบบ",
      actions: <StatusPill tone="success">Platform Green</StatusPill>,
      body: (
        <SectionGrid>
          <PanelCard eyebrow="Core Metrics" title="ตัวชี้วัดระบบ" description="สรุปภาพกว้างของ platform" className="px-[18px] py-4">
            <ThreeUpStats items={[["ร้านทั้งหมด", "รอเชื่อม API"], ["Owner accounts", "รอเชื่อม API"], ["Active sessions", "รอเชื่อม API"]]} />
          </PanelCard>

          <PanelCard eyebrow="Watch List" title="สิ่งที่ควรจับตา" description="รายการที่เกี่ยวกับ platform ไม่ปนกับ workflow หน้าร้าน" className="px-[18px] py-4">
            <NoteStack
              items={[
                "มี 2 ร้านที่ session churn สูงผิดปกติในชั่วโมงล่าสุด",
                "upload signing ถูกเรียกเพิ่มขึ้นหลังอัปเดตสินค้ารอบเช้า",
                "ยังไม่มี incident ระดับ security ที่เปิดค้างอยู่",
              ]}
            />
          </PanelCard>
        </SectionGrid>
      ),
    },
    stores: {
      eyebrow: "Tenant Directory",
      title: "ร้านค้าในระบบ",
      description: "ใช้ติดตามสถานะร้าน การเปิดใช้งาน และ tenant profile โดยไม่ยุ่งกับ owner shell",
      actions: <StatusPill>48 ร้านในระบบ</StatusPill>,
      body: (
        <SectionGrid>
          <PanelCard eyebrow="Store Status" title="สถานะร้านล่าสุด" description="รายการร้านที่ต้องติดตาม" className="px-[18px] py-4">
            <ListStack
              items={[
                { title: "Store directory", subtitle: "ยังไม่เชื่อม API รายการร้านจริง", value: <StatusPill>Pending API</StatusPill> },
              ]}
            />
          </PanelCard>

          <PanelCard eyebrow="Provisioning" title="งานระดับ tenant" description="ชุด action ของ superadmin ไม่แชร์กับ owner" className="px-[18px] py-4">
            <NoteStack items={["สร้างร้านใหม่", "ปิดร้านชั่วคราว", "รีเซ็ต owner access", "ตรวจ store slug"]} />
          </PanelCard>
        </SectionGrid>
      ),
    },
    owners: {
      eyebrow: "Identity Control",
      title: "เจ้าของร้าน",
      description: "ใช้จัดการ owner account, role binding และการเข้าถึงร้านในระดับ platform",
      actions: <StatusPill>Pending API</StatusPill>,
      body: (
        <SectionGrid>
          <PanelCard eyebrow="Owner Accounts" title="บัญชีล่าสุด" description="ตัวอย่างบัญชีที่ผูกกับ tenant ต่าง ๆ" className="px-[18px] py-4">
            <ListStack
              items={[
                { title: "Owner directory", subtitle: "ยังไม่เชื่อม API บัญชีเจ้าของร้านจริง", value: <StatusPill>Pending API</StatusPill> },
              ]}
            />
          </PanelCard>

          <PanelCard eyebrow="Role Binding" title="งานสิทธิ์และการเข้าถึง" description="โฟกัสเรื่อง identity management เท่านั้น" className="px-[18px] py-4">
            <NoteStack
              items={[
                "สร้าง owner account ใหม่และส่งคำเชิญ",
                "ย้าย owner ไปยังร้านใหม่",
                "ตรวจ owner ที่ไม่มี store binding",
              ]}
            />
          </PanelCard>
        </SectionGrid>
      ),
    },
    security: {
      eyebrow: "Security",
      title: "ความปลอดภัย",
      description: "มุมมองสำหรับดู session, CSRF, PIN flows และ event ที่เกี่ยวข้องกับความปลอดภัยระดับระบบ",
      actions: <StatusPill tone="success">No open incident</StatusPill>,
      body: (
        <SectionGrid>
          <PanelCard eyebrow="Session Health" title="สถานะ session" description="ตัวเลขฝั่ง auth ที่ต้องตาม" className="px-[18px] py-4">
            <ThreeUpStats items={[["Rolling refresh", "Healthy"], ["Expired cleanup", "Throttled"], ["PIN flow", "Operational"]]} />
          </PanelCard>

          <PanelCard eyebrow="Security Notes" title="รายการติดตาม" description="รายการสรุปแทน dashboard ยาว" className="px-[18px] py-4">
            <NoteStack
              items={[
                "ไม่มี session ที่เกิน absolute timeout เปิดค้างอยู่",
                "PIN failures ลดลงหลังแยก owner/superadmin paths",
                "origin และ CSRF checks ยังคงป้องกัน route สำคัญทั้งหมด",
              ]}
            />
          </PanelCard>
        </SectionGrid>
      ),
    },
    audit: {
      eyebrow: "Audit Trail",
      title: "Audit Log",
      description: "หน้าเฉพาะของ superadmin สำหรับตามเหตุการณ์ระดับระบบ ไม่ปะปนกับรายงานร้าน",
      actions: <StatusPill>Last event 2 min ago</StatusPill>,
      body: (
        <SectionGrid>
          <PanelCard eyebrow="Latest Events" title="เหตุการณ์ล่าสุด" description="ดู action ที่สำคัญแบบย่อ" className="px-[18px] py-4">
            <ListStack
              items={[
                { title: "Audit API", subtitle: "ยังไม่เชื่อม endpoint สำหรับอ่าน audit log จริง", value: <StatusPill>Pending API</StatusPill> },
              ]}
            />
          </PanelCard>

          <PanelCard eyebrow="Review Queue" title="รายการควรตรวจ" description="ใช้คัดกรองเหตุการณ์สำคัญ" className="px-[18px] py-4">
            <NoteStack
              items={[
                "ตรวจ login failures ที่เกิดซ้ำจาก IP เดียวกัน",
                "ตาม event การเปลี่ยนแปลงสิทธิ์ของ owner",
                "รีวิว upload policy ที่ออกโดย platform user",
              ]}
            />
          </PanelCard>
        </SectionGrid>
      ),
    },
    system: {
      eyebrow: "System Settings",
      title: "System",
      description: "พื้นที่สำหรับค่าระดับ platform เช่น integration, upload service, และ operational defaults",
      actions: <StatusPill>Ops Mode</StatusPill>,
      body: (
        <SectionGrid>
          <PanelCard eyebrow="Platform Services" title="บริการที่เชื่อมอยู่" description="เช็ก service สำคัญในมุม platform" className="px-[18px] py-4">
            <ThreeUpStats items={[["Backend API", "Online"], ["Database", "Online"], ["R2 Uploads", "Ready"]]} />
          </PanelCard>

          <PanelCard eyebrow="Ops Notes" title="บันทึกที่ต้องตาม" description="คงไว้เป็นสรุประดับดูแลระบบ" className="px-[18px] py-4">
            <NoteStack
              items={[
                "rotate signing credentials ตามรอบที่กำหนด",
                "ตรวจ rate limit metrics หลังเปิดใช้ owner shell ใหม่",
                "รีวิว env ที่ใช้กับ auth และ upload routes ก่อน deploy รอบถัดไป",
              ]}
            />
          </PanelCard>
        </SectionGrid>
      ),
    },
  };

  return screens[activeSection];
}

export function SuperAdminWorkspace({ session, activeSection }: SuperAdminWorkspaceProps) {
  const displayName = session.user.displayName;
  const screen = renderSuperAdminScreen(activeSection);

  return (
    <main className="workspace-screen-shell h-screen overflow-hidden max-[1180px]:h-auto max-[1180px]:overflow-auto">
      <div className="workspace-screen-frame mx-auto h-screen w-[min(1400px,calc(100%-32px))] px-0 py-3 max-[1180px]:h-auto max-[1180px]:w-[min(100%-24px,100%)] max-[1180px]:py-3 max-[820px]:w-[min(100%-16px,100%)] max-[720px]:pt-2.5">
        <BackofficeShell
          className="workspace-screen-content h-[calc(100vh-24px)] max-[1180px]:h-auto"
          brandName="POS MANS"
          brandSubtitle="ชุดควบคุมระดับระบบสำหรับดูร้านทั้งหมด เจ้าของร้าน ความปลอดภัย และการตั้งค่า platform"
          eyebrow="SUPERADMIN WORKSPACE"
          sidebarItems={(Object.keys(sectionMeta) as SuperAdminSectionKey[]).map((key) => ({
            label: sectionMeta[key].label,
            href: sectionMeta[key].href,
            active: key === activeSection,
          }))}
          profileName={displayName}
          profileSubtitle="Superadmin"
          profileMeta="Platform access · Root control"
          profileRole="SUPER ADMIN"
          profileStatus="ออนไลน์"
          profileAction={<LogoutButton />}
        >
          <PanelCard eyebrow={screen.eyebrow} title={screen.title} description={screen.description} actions={screen.actions}>
            {screen.body}
          </PanelCard>
        </BackofficeShell>
      </div>
    </main>
  );
}

