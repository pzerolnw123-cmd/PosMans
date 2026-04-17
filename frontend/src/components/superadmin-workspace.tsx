import type { ReactNode } from "react";
import type { SessionPayload } from "@/lib/session";
import { BackofficeShell, PanelCard } from "@/components/backoffice-shell";
import { LogoutButton } from "@/components/logout-button";

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
      actions: <span className="success-pill">Platform Green</span>,
      body: (
        <div className="screen-grid">
          <PanelCard eyebrow="Core Metrics" title="ตัวชี้วัดระบบ" description="สรุปภาพกว้างของ platform" className="compact-panel">
            <div className="dense-grid three-up">
              {[
                ["ร้านทั้งหมด", "48"],
                ["Owner accounts", "61"],
                ["Active sessions", "132"],
              ].map(([label, value]) => (
                <div key={label} className="mini-stat">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard eyebrow="Watch List" title="สิ่งที่ควรจับตา" description="รายการที่เกี่ยวกับ platform ไม่ปนกับ workflow หน้าร้าน" className="compact-panel">
            <div className="dense-grid">
              {[
                "มี 2 ร้านที่ session churn สูงผิดปกติในชั่วโมงล่าสุด",
                "upload signing ถูกเรียกเพิ่มขึ้นหลังอัปเดตสินค้ารอบเช้า",
                "ยังไม่มี incident ระดับ security ที่เปิดค้างอยู่",
              ].map((item) => (
                <div key={item} className="note-card">
                  {item}
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      ),
    },
    stores: {
      eyebrow: "Tenant Directory",
      title: "ร้านค้าในระบบ",
      description: "ใช้ติดตามสถานะร้าน การเปิดใช้งาน และ tenant profile โดยไม่ยุ่งกับ owner shell",
      actions: <span className="ghost-pill">48 ร้านในระบบ</span>,
      body: (
        <div className="screen-grid">
          <PanelCard eyebrow="Store Status" title="สถานะร้านล่าสุด" description="รายการร้านที่ต้องติดตาม" className="compact-panel">
            <div className="dense-grid">
              {[
                ["FastManFoods", "Active", "Owner 1"],
                ["Noodle Lab", "Pending", "Owner 2"],
                ["Rice Story", "Suspended", "Owner 1"],
              ].map(([name, state, owners]) => (
                <div key={name} className="list-row">
                  <div>
                    <strong>{name}</strong>
                    <p>{owners}</p>
                  </div>
                  <span className={state === "Active" ? "success-pill" : "ghost-pill"}>{state}</span>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard eyebrow="Provisioning" title="งานระดับ tenant" description="ชุด action ของ superadmin ไม่แชร์กับ owner" className="compact-panel">
            <div className="dense-grid">
              {["สร้างร้านใหม่", "ปิดร้านชั่วคราว", "รีเซ็ต owner access", "ตรวจ store slug"].map((item) => (
                <div key={item} className="note-card">
                  {item}
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      ),
    },
    owners: {
      eyebrow: "Identity Control",
      title: "เจ้าของร้าน",
      description: "ใช้จัดการ owner account, role binding และการเข้าถึงร้านในระดับ platform",
      actions: <span className="ghost-pill">61 owner accounts</span>,
      body: (
        <div className="screen-grid">
          <PanelCard eyebrow="Owner Accounts" title="บัญชีล่าสุด" description="ตัวอย่างบัญชีที่ผูกกับ tenant ต่าง ๆ" className="compact-panel">
            <div className="dense-grid">
              {[
                ["owner.fastmanfoods", "FastManFoods", "Active"],
                ["owner.noodlelab", "Noodle Lab", "Invite pending"],
                ["owner.ricestory", "Rice Story", "Active"],
              ].map(([username, store, state]) => (
                <div key={username} className="list-row">
                  <div>
                    <strong>{username}</strong>
                    <p>{store}</p>
                  </div>
                  <span className="ghost-pill">{state}</span>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard eyebrow="Role Binding" title="งานสิทธิ์และการเข้าถึง" description="โฟกัสเรื่อง identity management เท่านั้น" className="compact-panel">
            <div className="dense-grid">
              {[
                "สร้าง owner account ใหม่และส่งคำเชิญ",
                "ย้าย owner ไปยังร้านใหม่",
                "ตรวจ owner ที่ไม่มี store binding",
              ].map((item) => (
                <div key={item} className="note-card">
                  {item}
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      ),
    },
    security: {
      eyebrow: "Security",
      title: "ความปลอดภัย",
      description: "มุมมองสำหรับดู session, CSRF, PIN flows และ event ที่เกี่ยวข้องกับความปลอดภัยระดับระบบ",
      actions: <span className="success-pill">No open incident</span>,
      body: (
        <div className="screen-grid">
          <PanelCard eyebrow="Session Health" title="สถานะ session" description="ตัวเลขฝั่ง auth ที่ต้องตาม" className="compact-panel">
            <div className="dense-grid three-up">
              {[
                ["Rolling refresh", "Healthy"],
                ["Expired cleanup", "Throttled"],
                ["PIN flow", "Operational"],
              ].map(([label, value]) => (
                <div key={label} className="mini-stat">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard eyebrow="Security Notes" title="รายการติดตาม" description="รายการสรุปแทน dashboard ยาว" className="compact-panel">
            <div className="dense-grid">
              {[
                "ไม่มี session ที่เกิน absolute timeout เปิดค้างอยู่",
                "PIN failures ลดลงหลังแยก owner/superadmin paths",
                "origin และ CSRF checks ยังคงป้องกัน route สำคัญทั้งหมด",
              ].map((item) => (
                <div key={item} className="note-card">
                  {item}
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      ),
    },
    audit: {
      eyebrow: "Audit Trail",
      title: "Audit Log",
      description: "หน้าเฉพาะของ superadmin สำหรับตามเหตุการณ์ระดับระบบ ไม่ปะปนกับรายงานร้าน",
      actions: <span className="ghost-pill">Last event 2 min ago</span>,
      body: (
        <div className="screen-grid">
          <PanelCard eyebrow="Latest Events" title="เหตุการณ์ล่าสุด" description="ดู action ที่สำคัญแบบย่อ" className="compact-panel">
            <div className="dense-grid">
              {[
                ["LOGIN_SUCCEEDED", "owner.fastmanfoods", "success"],
                ["UPLOAD_POLICY_ISSUED", "superadmin", "success"],
                ["LOGIN_FAILED", "owner.noodlelab", "denied"],
              ].map(([action, actor, state]) => (
                <div key={`${action}-${actor}`} className="list-row">
                  <div>
                    <strong>{action}</strong>
                    <p>{actor}</p>
                  </div>
                  <span className="ghost-pill">{state}</span>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard eyebrow="Review Queue" title="รายการควรตรวจ" description="ใช้คัดกรองเหตุการณ์สำคัญ" className="compact-panel">
            <div className="dense-grid">
              {[
                "ตรวจ login failures ที่เกิดซ้ำจาก IP เดียวกัน",
                "ตาม event การเปลี่ยนแปลงสิทธิ์ของ owner",
                "รีวิว upload policy ที่ออกโดย platform user",
              ].map((item) => (
                <div key={item} className="note-card">
                  {item}
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      ),
    },
    system: {
      eyebrow: "System Settings",
      title: "System",
      description: "พื้นที่สำหรับค่าระดับ platform เช่น integration, upload service, และ operational defaults",
      actions: <span className="ghost-pill">Ops Mode</span>,
      body: (
        <div className="screen-grid">
          <PanelCard eyebrow="Platform Services" title="บริการที่เชื่อมอยู่" description="เช็ก service สำคัญในมุม platform" className="compact-panel">
            <div className="dense-grid three-up">
              {[
                ["Backend API", "Online"],
                ["Database", "Online"],
                ["R2 Uploads", "Ready"],
              ].map(([label, value]) => (
                <div key={label} className="mini-stat">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard eyebrow="Ops Notes" title="งานระบบที่ควรทำต่อ" description="รายการสั้นสำหรับทีม platform" className="compact-panel">
            <div className="dense-grid">
              {[
                "แยก metrics dashboard ภายนอกสำหรับ production",
                "เพิ่ม background cleanup แทน request-based cleanup ในอนาคต",
                "ต่อ system settings เข้ากับ backend config APIs",
              ].map((item) => (
                <div key={item} className="note-card">
                  {item}
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      ),
    },
  };

  return screens[activeSection];
}

export function SuperAdminWorkspace({ session, activeSection }: SuperAdminWorkspaceProps) {
  const displayName = session.user.displayName;
  const screen = renderSuperAdminScreen(activeSection);

  return (
    <main className="admin-main superadmin-main">
      <div className="app-frame admin-frame">
        <BackofficeShell
          className="admin-viewport"
          brandName="Platform Console"
          brandSubtitle="พื้นที่เฉพาะของ superadmin สำหรับดูแล tenant, owner accounts, security, audit และ system operations"
          eyebrow="SUPERADMIN"
          sidebarItems={(Object.keys(sectionMeta) as SuperAdminSectionKey[]).map((key) => ({
            label: sectionMeta[key].label,
            href: sectionMeta[key].href,
            active: key === activeSection,
          }))}
          profileName={displayName}
          profileSubtitle="Super Admin"
          profileMeta="Platform-level access"
          profileStatus="ออนไลน์"
          profileAction={<LogoutButton />}
        >
          <PanelCard eyebrow={screen.eyebrow} title={screen.title} description={screen.description} actions={screen.actions}>
            {screen.body}
          </PanelCard>

          <div className="admin-footer-grid">
            <PanelCard eyebrow="Boundary" title="เหตุผลที่แยก route" description="owner flow และ superadmin flow ถูกแยกกันเพื่อไม่ให้ logic ปะปนกัน" className="compact-panel">
              <div className="dense-grid">
                {[
                  "owner path โฟกัสเรื่องร้านเดียวและงานหน้าร้าน",
                  "superadmin path โฟกัสเรื่อง platform, tenants, identity และ security",
                ].map((item) => (
                  <div key={item} className="note-card">
                    {item}
                  </div>
                ))}
              </div>
            </PanelCard>

            <PanelCard eyebrow="Scope" title="Platform Snapshot" description="ข้อมูลระดับระบบสั้น ๆ สำหรับ footer ทุกหน้า" className="compact-panel">
              <div className="dense-grid three-up">
                {[
                  ["Role", "SUPER_ADMIN"],
                  ["Area", "Platform"],
                  ["Auth", "Segregated"],
                ].map(([label, value]) => (
                  <div key={label} className="mini-stat">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </PanelCard>
          </div>
        </BackofficeShell>
      </div>
    </main>
  );
}
