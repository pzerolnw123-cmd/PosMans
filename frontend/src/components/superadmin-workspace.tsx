import type { ReactNode } from "react";
import type { SessionPayload } from "@/lib/session";
import { BackofficeShell, PanelCard } from "@/components/backoffice-shell";
import { LogoutButton } from "@/components/logout-button";
import { SessionExpiryGuard } from "@/components/session-expiry-guard";
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
  return <div className="mt-4 grid grid-cols-2 gap-[14px] [@media(orientation:portrait)]:grid-cols-1 [@media(orientation:portrait)]:gap-4 max-[1180px]:grid-cols-1 max-[820px]:gap-4">{children}</div>;
}

function ThreeUpStats({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid grid-cols-3 gap-[10px] [@media(orientation:portrait)]:grid-cols-2 [@media(orientation:portrait)_and_(max-width:640px)]:grid-cols-1 max-[1180px]:grid-cols-2 max-[720px]:grid-cols-1">
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
      description: "พื้นที่นี้ใช้ดูภาพรวมร้าน เจ้าของร้าน และความพร้อมของระบบ",
      actions: <StatusPill tone="success">Platform Green</StatusPill>,
      body: (
        <SectionGrid>
          <PanelCard eyebrow="Core Metrics" title="ตัวชี้วัดระบบ" description="สรุปภาพกว้างของ platform" className="px-[18px] py-4">
            <ThreeUpStats items={[["ร้านทั้งหมด", "รอข้อมูลจริง"], ["บัญชีเจ้าของร้าน", "รอข้อมูลจริง"], ["เซสชันที่ใช้งาน", "รอข้อมูลจริง"]]} />
          </PanelCard>

          <PanelCard eyebrow="Watch List" title="สิ่งที่ควรจับตา" description="รายการติดตามของผู้ดูแลระบบ" className="px-[18px] py-4">
            <NoteStack
              items={[
                "มี 2 ร้านที่การเข้าใช้งานเปลี่ยนแปลงสูงในชั่วโมงล่าสุด",
                "การอัปโหลดถูกใช้งานเพิ่มขึ้นหลังอัปเดตสินค้ารอบเช้า",
                "ยังไม่มีเหตุการณ์สำคัญที่เปิดค้างอยู่",
              ]}
            />
          </PanelCard>
        </SectionGrid>
      ),
    },
    stores: {
      eyebrow: "Tenant Directory",
      title: "ร้านค้าในระบบ",
      description: "ใช้ติดตามสถานะร้าน การเปิดใช้งาน และข้อมูลร้าน",
      actions: <StatusPill>48 ร้านในระบบ</StatusPill>,
      body: (
        <SectionGrid>
          <PanelCard eyebrow="Store Status" title="สถานะร้านล่าสุด" description="รายการร้านที่ต้องติดตาม" className="px-[18px] py-4">
            <ListStack
              items={[
                { title: "รายชื่อร้าน", subtitle: "รอเชื่อมข้อมูลรายการร้านจริง", value: <StatusPill>รอข้อมูล</StatusPill> },
              ]}
            />
          </PanelCard>

          <PanelCard eyebrow="Provisioning" title="งานระดับร้าน" description="ชุดงานสำหรับผู้ดูแลระบบ" className="px-[18px] py-4">
            <NoteStack items={["สร้างร้านใหม่", "ปิดร้านชั่วคราว", "รีเซ็ตการเข้าถึงของเจ้าของร้าน", "ตรวจรหัสร้าน"]} />
          </PanelCard>
        </SectionGrid>
      ),
    },
    owners: {
      eyebrow: "Identity Control",
      title: "เจ้าของร้าน",
      description: "ใช้จัดการบัญชีเจ้าของร้านและการเข้าถึงร้าน",
      actions: <StatusPill>รอข้อมูล</StatusPill>,
      body: (
        <SectionGrid>
          <PanelCard eyebrow="Owner Accounts" title="บัญชีล่าสุด" description="ตัวอย่างบัญชีที่ผูกกับ tenant ต่าง ๆ" className="px-[18px] py-4">
            <ListStack
              items={[
                { title: "บัญชีเจ้าของร้าน", subtitle: "รอเชื่อมข้อมูลบัญชีจริง", value: <StatusPill>รอข้อมูล</StatusPill> },
              ]}
            />
          </PanelCard>

          <PanelCard eyebrow="Role Binding" title="งานสิทธิ์และการเข้าถึง" description="โฟกัสการจัดการบัญชีเท่านั้น" className="px-[18px] py-4">
            <NoteStack
              items={[
                "สร้างบัญชีเจ้าของร้านใหม่และส่งคำเชิญ",
                "ย้ายเจ้าของร้านไปยังร้านใหม่",
                "ตรวจบัญชีที่ยังไม่ได้ผูกร้าน",
              ]}
            />
          </PanelCard>
        </SectionGrid>
      ),
    },
    security: {
      eyebrow: "Security",
      title: "ความปลอดภัย",
      description: "มุมมองสำหรับดูสถานะการเข้าใช้งานและเหตุการณ์สำคัญระดับระบบ",
      actions: <StatusPill tone="success">No open incident</StatusPill>,
      body: (
        <SectionGrid>
          <PanelCard eyebrow="Access Health" title="สถานะการเข้าใช้งาน" description="ตัวเลขสำคัญที่ต้องติดตาม" className="px-[18px] py-4">
            <ThreeUpStats items={[["การใช้งานต่อเนื่อง", "ปกติ"], ["การปิดรอบเก่า", "ปกติ"], ["PIN", "พร้อมใช้งาน"]]} />
          </PanelCard>

          <PanelCard eyebrow="Security Notes" title="รายการติดตาม" description="รายการสรุปแทน dashboard ยาว" className="px-[18px] py-4">
            <NoteStack
              items={[
                "ไม่มีรอบการใช้งานเก่าที่เปิดค้างอยู่",
                "การกรอก PIN ผิดลดลงจากช่วงก่อนหน้า",
                "เส้นทางสำคัญยังตรวจสิทธิ์ก่อนใช้งาน",
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
                { title: "บันทึกเหตุการณ์", subtitle: "รอเชื่อมข้อมูลเหตุการณ์จริง", value: <StatusPill>รอข้อมูล</StatusPill> },
              ]}
            />
          </PanelCard>

          <PanelCard eyebrow="Review Queue" title="รายการควรตรวจ" description="ใช้คัดกรองเหตุการณ์สำคัญ" className="px-[18px] py-4">
            <NoteStack
              items={[
                "ตรวจการเข้าสู่ระบบไม่สำเร็จที่เกิดซ้ำ",
                "ตาม event การเปลี่ยนแปลงสิทธิ์ของ owner",
                "รีวิวการออกสิทธิ์อัปโหลดของผู้ดูแลระบบ",
              ]}
            />
          </PanelCard>
        </SectionGrid>
      ),
    },
    system: {
      eyebrow: "System Settings",
      title: "System",
      description: "พื้นที่สำหรับค่าระบบ การเชื่อมต่อ และค่าเริ่มต้นการปฏิบัติงาน",
      actions: <StatusPill>Ops Mode</StatusPill>,
      body: (
        <SectionGrid>
          <PanelCard eyebrow="Platform Services" title="บริการที่เชื่อมอยู่" description="เช็ก service สำคัญในมุม platform" className="px-[18px] py-4">
            <ThreeUpStats items={[["บริการหลัก", "พร้อมใช้งาน"], ["ข้อมูลระบบ", "พร้อมใช้งาน"], ["การอัปโหลด", "พร้อมใช้งาน"]]} />
          </PanelCard>

          <PanelCard eyebrow="Ops Notes" title="บันทึกที่ต้องตาม" description="คงไว้เป็นสรุประดับดูแลระบบ" className="px-[18px] py-4">
            <NoteStack
              items={[
                "หมุนเวียนข้อมูลรับรองตามรอบที่กำหนด",
                "ตรวจปริมาณการใช้งานหลังเปิดหน้าหลังบ้านใหม่",
                "รีวิวค่าตั้งค่าระบบก่อนอัปเดตรอบถัดไป",
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
    <main className="workspace-screen-shell h-screen overflow-hidden [@media(orientation:portrait)]:h-auto [@media(orientation:portrait)]:overflow-auto max-[1180px]:h-auto max-[1180px]:overflow-auto">
      <div className="workspace-screen-frame mx-auto h-screen w-[min(1400px,calc(100%-32px))] px-0 py-3 [@media(orientation:portrait)]:h-auto [@media(orientation:portrait)]:w-[min(100%-24px,100%)] [@media(orientation:portrait)]:py-3 [@media(orientation:portrait)_and_(max-width:720px)]:w-[min(100%-16px,100%)] [@media(orientation:portrait)_and_(max-width:720px)]:pt-2.5 max-[1180px]:h-auto max-[1180px]:w-[min(100%-24px,100%)] max-[1180px]:py-3 max-[820px]:w-[min(100%-16px,100%)] max-[720px]:pt-2.5">
        <BackofficeShell
          className="workspace-screen-content h-[calc(100vh-24px)] [@media(orientation:portrait)]:h-auto max-[1180px]:h-auto"
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
          <SessionExpiryGuard initialExpiresAt={session.session.expiresAt} />
          <PanelCard eyebrow={screen.eyebrow} title={screen.title} description={screen.description} actions={screen.actions}>
            {screen.body}
          </PanelCard>
        </BackofficeShell>
      </div>
    </main>
  );
}

