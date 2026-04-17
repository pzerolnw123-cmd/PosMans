import type { ReactNode } from "react";
import type { SessionPayload } from "@/lib/session";
import { BackofficeShell, PanelCard } from "@/components/backoffice-shell";
import { LogoutButton } from "@/components/logout-button";
import { InteractiveActionGrid } from "@/components/interactive-action-grid";
import { OwnerPasswordClient, OwnerProfileClient } from "@/components/owner-settings-client";
import { ProductManagementStudio } from "@/components/product-management-studio";

export type OwnerSectionKey = "sales" | "payments" | "receipts" | "reports" | "menu" | "overview" | "settings";

type OwnerWorkspaceProps = {
  session: SessionPayload;
  activeSection: OwnerSectionKey;
};

const sectionMeta: Record<OwnerSectionKey, { label: string; href: string }> = {
  sales: { label: "ขาย", href: "/owner/sales" },
  payments: { label: "ชำระเงิน", href: "/owner/payments" },
  receipts: { label: "ใบเสร็จ", href: "/owner/receipts" },
  reports: { label: "รายงาน", href: "/owner/reports" },
  menu: { label: "สินค้า", href: "/owner/menu" },
  overview: { label: "ภาพรวม", href: "/owner/overview" },
  settings: { label: "ตั้งค่า", href: "/owner" },
};

function formatRoleLabel(session: SessionPayload) {
  if (session.user.storeRole) {
    return `Store ${session.user.storeRole}`;
  }

  return "Owner";
}

function renderOwnerScreen(activeSection: OwnerSectionKey, storeName: string, ownerName: string) {
  const screens: Record<
    OwnerSectionKey,
    {
      eyebrow: string;
      title: string;
      description: string;
      actions?: ReactNode;
      body: ReactNode;
      standalone?: boolean;
    }
  > = {
    sales: {
      eyebrow: "Sales Floor",
      title: "ขายหน้าร้าน",
      description: "มุมมองสำหรับเจ้าของร้านที่ต้องการเห็นโต๊ะ คิว และ action ที่เกิดขึ้นบ่อย โดยแยก interaction ออกเป็น client islands เฉพาะจุด",
      actions: <span className="success-pill">4 โต๊ะกำลังใช้งาน</span>,
      body: (
        <div className="screen-grid">
          <PanelCard eyebrow="Now Serving" title="โต๊ะที่กำลังเดินบิล" description="ลำดับโต๊ะที่ควรเช็กต่อ" className="compact-panel">
            <div className="dense-grid two-up">
              {[
                ["A01", "2 รายการใหม่", "รอส่งครัว"],
                ["A03", "เพิ่มเครื่องดื่ม", "พร้อมเสิร์ฟ"],
                ["B02", "สั่งกลับบ้าน", "รอชำระเงิน"],
                ["C01", "โต๊ะใหญ่ 6 ที่", "กำลังเตรียมอาหาร"],
              ].map(([table, order, status]) => (
                <div key={table} className="mini-stat">
                  <strong>{table}</strong>
                  <span>{order}</span>
                  <p>{status}</p>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard eyebrow="Fast Actions" title="คิวลัดของแคชเชียร์" description="ส่วน interactive ถูกแยกเป็น client component" className="compact-panel">
            <InteractiveActionGrid
              items={["เปิดโต๊ะใหม่", "รับกลับบ้าน", "ค้นหาบิล", "ย้ายโต๊ะ", "Hold บิล", "เรียกเก็บเงิน"]}
            />
          </PanelCard>
        </div>
      ),
    },
    payments: {
      eyebrow: "Checkout",
      title: "ชำระเงิน",
      description: "สรุปยอดชำระ วิธีรับเงิน และทางลัดฝั่งแคชเชียร์ในพื้นที่เดียว",
      actions: <span className="ghost-pill">บิลล่าสุด 1,280 บาท</span>,
      body: (
        <div className="screen-grid">
          <PanelCard eyebrow="Bill Summary" title="ยอดที่ต้องรับ" description="ค่าสินค้า ภาษี ส่วนลด และยอดสุทธิ" className="compact-panel">
            <div className="receipt-stack">
              {[
                ["ค่าอาหาร", "1,120 บาท"],
                ["ค่าบริการ", "80 บาท"],
                ["ส่วนลดสมาชิก", "-40 บาท"],
                ["ยอดสุทธิ", "1,160 บาท"],
              ].map(([label, value]) => (
                <div key={label} className="data-row">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard eyebrow="Payment Actions" title="เลือก flow การชำระ" description="ส่วนนี้โต้ตอบได้โดยไม่กระทบ shell หลัก" className="compact-panel">
            <InteractiveActionGrid items={["เงินสด", "โอนเงิน", "บัตร", "แยกบิล", "คืนเงิน", "พิมพ์สลิป"]} />
          </PanelCard>
        </div>
      ),
    },
    receipts: {
      eyebrow: "Receipt Desk",
      title: "ใบเสร็จ",
      description: "รวมการค้นบิล ซ้ำพิมพ์ และส่งสลิปแบบย่อในจอเดียว",
      actions: <span className="ghost-pill">พร้อมพิมพ์ 12 รายการ</span>,
      body: (
        <div className="screen-grid">
          <PanelCard eyebrow="Recent Receipts" title="บิลล่าสุด" description="ค้นบิลได้จากรายการสั้น" className="compact-panel">
            <div className="dense-grid">
              {[
                ["RC-1042", "โต๊ะ A03", "1,280 บาท"],
                ["RC-1041", "กลับบ้าน", "245 บาท"],
                ["RC-1040", "โต๊ะ C01", "3,450 บาท"],
              ].map(([code, source, total]) => (
                <div key={code} className="list-row">
                  <div>
                    <strong>{code}</strong>
                    <p>{source}</p>
                  </div>
                  <span>{total}</span>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard eyebrow="Print & Share" title="งานหลังปิดบิล" description="ปุ่มเหล่านี้แยกเป็น client island" className="compact-panel">
            <InteractiveActionGrid items={["พิมพ์ซ้ำ", "ส่งอีเมล", "ส่งไลน์", "ดูรายละเอียด"]} columns={2} />
          </PanelCard>
        </div>
      ),
    },
    reports: {
      eyebrow: "Reports",
      title: "รายงาน",
      description: "มุมมองอ่านเร็วสำหรับยอดขาย บิลเฉลี่ย และสิ่งที่ต้องจับตาในวันเดียว",
      actions: <span className="success-pill">อัปเดตล่าสุด 5 นาทีที่แล้ว</span>,
      body: (
        <div className="screen-grid">
          <PanelCard eyebrow="Today" title="ตัวชี้วัดสำคัญวันนี้" description="ตัวเลขหลักที่เจ้าของร้านใช้ตัดสินใจ" className="compact-panel">
            <div className="dense-grid three-up">
              {[
                ["ยอดขาย", "28,450"],
                ["บิลเฉลี่ย", "412"],
                ["ช่วงพีค", "12:30"],
              ].map(([label, value]) => (
                <div key={label} className="mini-stat">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard eyebrow="Highlights" title="สิ่งที่ต้องจับตา" description="แทนกราฟยาวด้วยโน้ตที่อ่านจบเร็ว" className="compact-panel">
            <div className="dense-grid">
              {[
                "สินค้าขายดีที่สุดวันนี้คือ American Fried Rice",
                "ยอดขายเครื่องดื่มเพิ่มขึ้น 14% จากเมื่อวาน",
                "สาขานี้มี 3 บิลที่ยังไม่ปิดเก็บเงิน",
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
    menu: {
      eyebrow: "Product Studio",
      title: "สินค้า",
      description: "จัดการสินค้าแบบหน้าจอเดียวตามมุมมองร้าน ใช้รายการด้านขวาและฟอร์มแก้ไขด้านซ้ายตามภาพอ้างอิง",
      body: <ProductManagementStudio />,
      standalone: true,
    },
    overview: {
      eyebrow: "Overview",
      title: "ภาพรวมร้าน",
      description: "หน้ารวมสำหรับ owner โดยไม่ปะปนเรื่อง platform-level control ของ superadmin",
      actions: <span className="ghost-pill">{storeName}</span>,
      body: (
        <div className="screen-grid">
          <PanelCard eyebrow="Store Pulse" title="สถานะวันนี้" description="ตัวเลขหลักของร้านในวันเดียว" className="compact-panel">
            <div className="dense-grid three-up">
              {[
                ["ออเดอร์เปิด", "8"],
                ["ยอดขายสด", "28.4K"],
                ["พนักงานเข้าเวร", "6"],
              ].map(([label, value]) => (
                <div key={label} className="mini-stat">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard eyebrow="Owner Notes" title="สิ่งที่ควรเช็กวันนี้" description="โน้ตสั้นสำหรับผู้ดูแลร้าน" className="compact-panel">
            <div className="dense-grid">
              {[
                "ตรวจ stock วัตถุดิบที่ใช้กับสินค้าขายดีช่วงเที่ยง",
                "ตามบิลค้างชำระ 1 บิลจากเดลิเวอรี",
                "อัปเดตสินค้าโปรโมชันก่อนรอบเย็น",
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
    settings: {
      eyebrow: "Store Settings",
      title: "ตั้งค่าร้าน",
      description: "หน้า owner settings นี้แยกฟอร์ม interactive ออกเป็น client components โดยคง shell ฝั่ง server ไว้ให้เบา",
      actions: <span className="success-pill">พร้อมใช้งานแล้ว</span>,
      body: (
        <div className="screen-grid">
          <PanelCard eyebrow="ความปลอดภัยของบัญชี" title="เปลี่ยนรหัสผ่าน" description="เฉพาะบล็อกฟอร์มนี้ที่เป็น client-side" className="compact-panel">
            <OwnerPasswordClient />
          </PanelCard>

          <PanelCard eyebrow="โปรไฟล์ร้านค้า" title="ข้อมูลทั่วไป" description="แก้ชื่อร้านและเจ้าของได้โดยไม่ลากทั้งหน้าไปเป็น client" className="compact-panel">
            <OwnerProfileClient storeName={storeName} ownerName={ownerName} />
          </PanelCard>
        </div>
      ),
    },
  };

  return screens[activeSection];
}

export function OwnerWorkspace({ session, activeSection }: OwnerWorkspaceProps) {
  const storeName = session.user.store?.name || "FastManFoods";
  const ownerName = session.user.displayName;
  const roleLabel = formatRoleLabel(session);
  const screen = renderOwnerScreen(activeSection, storeName, ownerName);
  const showFooterCards = !screen.standalone;

  return (
    <main className="admin-main">
      <div className="app-frame admin-frame">
        <BackofficeShell
          className="admin-viewport"
          brandName={storeName}
          brandSubtitle="โหมดใช้งานหลักสำหรับเจ้าของร้านที่ต้องการขาย จัดการสินค้า ดูรายงาน และควบคุมภาพหน้าร้านได้จากบัญชีเดียว"
          eyebrow="OWNER WORKSPACE"
          sidebarItems={(Object.keys(sectionMeta) as OwnerSectionKey[]).map((key) => ({
            label: sectionMeta[key].label,
            href: sectionMeta[key].href,
            active: key === activeSection,
          }))}
          profileName={storeName}
          profileSubtitle="เจ้าของร้าน"
          profileMeta={`${ownerName} · ${roleLabel}`}
          profileStatus="ออนไลน์"
          profileAction={<LogoutButton />}
        >
          {screen.standalone ? (
            screen.body
          ) : (
            <PanelCard eyebrow={screen.eyebrow} title={screen.title} description={screen.description} actions={screen.actions}>
              {screen.body}
            </PanelCard>
          )}

          {showFooterCards ? (
            <div className="admin-footer-grid">
              <PanelCard eyebrow="Store Snapshot" title="สถานะการใช้งาน" description="ข้อมูลของร้านเท่านั้น ไม่ปะปนงานระดับ platform" className="compact-panel">
                <div className="dense-grid three-up">
                  {[
                    ["ร้าน", storeName],
                    ["ผู้ใช้", ownerName],
                    ["Session", "Secure"],
                  ].map(([label, value]) => (
                    <div key={label} className="mini-stat">
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </PanelCard>

              <PanelCard eyebrow="Render Strategy" title="Owner Interactive Islands" description="เฉพาะปุ่มและฟอร์มที่ต้องโต้ตอบถูกแยกเป็น client components" className="compact-panel">
                <div className="dense-grid">
                  {[
                    "shell หลัก, nav และ data summary ยัง render ฝั่ง server",
                    "action grid และ forms ย้ายเป็น client islands เพื่อลด logic ปะปน",
                  ].map((item) => (
                    <div key={item} className="note-card">
                      {item}
                    </div>
                  ))}
                </div>
              </PanelCard>
            </div>
          ) : null}
        </BackofficeShell>
      </div>
    </main>
  );
}
