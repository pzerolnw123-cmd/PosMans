import type { ReactNode } from "react";
import type { SessionPayload } from "@/lib/session";
import { BackofficeShell, PanelCard } from "@/components/backoffice-shell";
import { LogoutButton } from "@/components/logout-button";
import { InteractiveActionGrid } from "@/components/interactive-action-grid";
import { OwnerPasswordClient, OwnerProfileClient } from "@/components/owner-settings-client";
import { ProductManagementStudio } from "@/components/product-management-studio";
import { StatusPill } from "@/components/ui-primitives";

export type OwnerSectionKey = "sales" | "payments" | "receipts" | "reports" | "menu" | "overview" | "settings";

type OwnerWorkspaceProps = {
  session: SessionPayload;
  activeSection: OwnerSectionKey;
};

function SectionGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-[14px] mt-4 max-[1180px]:grid-cols-1">{children}</div>;
}

function ThreeUpStats({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid grid-cols-3 gap-[10px] max-[1180px]:grid-cols-2 max-[720px]:grid-cols-1">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-[14px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(22,27,38,0.94)_0%,rgba(18,22,34,0.92)_100%)] p-[14px]"
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
          className="rounded-[14px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(22,27,38,0.94)_0%,rgba(18,22,34,0.92)_100%)] px-4 py-[14px] leading-[1.5] text-[0.9rem] text-[var(--foreground-soft)]"
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
          className="flex items-center justify-between gap-[14px] rounded-[14px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(22,27,38,0.94)_0%,rgba(18,22,34,0.92)_100%)] px-4 py-[14px]"
        >
          <div>
            <strong className="block text-[1.28rem] leading-[1.05] tracking-[-0.04em]">{item.title}</strong>
            <p className="mt-[6px] text-[0.9rem] text-[var(--foreground-soft)]">{item.subtitle}</p>
          </div>
          <span className="text-[0.92rem] font-bold text-[var(--foreground)]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function DataStack({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-[10px]">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="flex items-center justify-between gap-[14px] rounded-xl border border-[var(--border)] bg-[rgba(22,27,38,0.72)] px-[14px] py-3"
        >
          <span className="text-[var(--foreground-soft)]">{label}</span>
          <strong className="text-[1rem]">{value}</strong>
        </div>
      ))}
    </div>
  );
}

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
      description: "โครงหน้าขายแบบอิง reference เดิม แต่ย้ายไปใช้ Tailwind utility ใน JSX เพื่อให้ปรับหน้านี้ได้ตรงจุด",
      actions: <StatusPill tone="success">Layout Locked</StatusPill>,
      body: (
        <section
          className="grid h-full min-h-0 grid-rows-[156px_minmax(0,1fr)] gap-[18px] max-[1180px]:grid-rows-[auto_minmax(0,1fr)]"
          aria-label="sales layout"
        >
          <div className="flex h-[156px] min-h-[156px] max-h-[156px] items-start justify-between overflow-hidden rounded-[20px] border border-[var(--border)] bg-[rgba(22,27,38,0.85)] px-5 py-6 shadow-[var(--shadow-soft)] max-[1180px]:h-auto max-[1180px]:min-h-[156px] max-[720px]:flex-col max-[720px]:items-stretch max-[720px]:gap-4">
            <div>
              <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Sales Floor</p>
              <strong className="mt-2 block text-[1.35rem] leading-none tracking-[-0.04em] text-white">ขายหน้าร้าน</strong>
            </div>
            <div className="flex flex-none items-center gap-3 max-[720px]:w-full" aria-hidden="true">
              <div className="h-5 w-[72px] rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.06)] max-[720px]:w-full" />
              <div className="h-5 w-[136px] rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.06)] max-[720px]:w-full" />
            </div>
          </div>

          <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_320px] gap-[18px] max-[1180px]:grid-cols-1">
            <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-[18px]" aria-label="sales main area">
              <div className="grid min-h-[152px] content-between gap-[18px] rounded-[18px] border border-[rgba(100,120,160,0.18)] bg-[linear-gradient(180deg,rgba(22,27,38,0.94),rgba(18,22,34,0.9))] px-[22px] py-5">
                <div>
                  <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Today Queue</p>
                  <h3 className="my-[10px] text-[1.4rem] leading-none tracking-[-0.04em] text-white">ขายวันนี้ 24 บิล</h3>
                  <p className="m-0 text-[0.95rem] leading-[1.65] text-[var(--foreground-soft)]">
                    ออเดอร์ล่าสุดโต๊ะ A12, ซื้อกลับบ้าน 3 ออเดอร์, และมี 2 บิลรอชำระเงิน
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <StatusPill>โต๊ะว่าง 8</StatusPill>
                  <StatusPill>กำลังทำ 5</StatusPill>
                  <StatusPill tone="success">พร้อมเสิร์ฟ 3</StatusPill>
                </div>
              </div>

              <div className="grid min-h-0 grid-cols-4 gap-4 max-[1180px]:grid-cols-3 max-[720px]:grid-cols-2" aria-label="products">
                {[
                  ["ข้าวกะเพราหมู", "เมนูหลัก", "฿65"],
                  ["ข้าวผัดอเมริกัน", "ขายดี", "฿89"],
                  ["ผัดไทยกุ้งสด", "ครัวร้อน", "฿79"],
                  ["ชาไทยเย็น", "เครื่องดื่ม", "฿45"],
                  ["ต้มยำรวมมิตร", "เมนูแนะนำ", "฿120"],
                  ["ข้าวหมูทอด", "พร้อมขาย", "฿69"],
                  ["โค้กไม่มีน้ำตาล", "เครื่องดื่ม", "฿25"],
                  ["บราวนี่", "ของหวาน", "฿49"],
                ].map(([name, group, price]) => (
                  <article
                    key={name}
                    className="grid min-h-[172px] content-start gap-3 rounded-[18px] border border-[rgba(100,120,160,0.18)] bg-[linear-gradient(180deg,rgba(26,32,48,0.92),rgba(22,27,38,0.92))] p-[14px]"
                  >
                    <div className="min-h-[104px] rounded-2xl border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.04)]" />
                    <div className="grid gap-1.5">
                      <strong className="text-base leading-[1.2] text-white">{name}</strong>
                      <span className="m-0 text-[0.95rem] text-[var(--foreground-soft)]">{group}</span>
                    </div>
                    <b className="text-base leading-[1.2] text-white">{price}</b>
                  </article>
                ))}
              </div>

              <div className="flex justify-between gap-4 max-[720px]:flex-col">
                <button
                  type="button"
                  className="inline-flex h-[58px] w-[168px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[rgba(22,27,38,0.8)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[rgba(0,0,0,0.15)_0_5px_10px] max-[720px]:w-full"
                >
                  พักบิล
                </button>
                <button
                  type="button"
                  className="inline-flex h-[58px] w-[168px] items-center justify-center rounded-2xl border border-transparent bg-[linear-gradient(135deg,var(--brand)_0%,#8070f0_100%)] px-[18px] font-bold text-white shadow-[rgba(108,92,231,0.18)_0_6px_14px] transition hover:-translate-y-px max-[720px]:w-full"
                >
                  ไปชำระเงิน
                </button>
              </div>
            </section>

            <aside
              className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-[18px] rounded-[18px] border border-[var(--border)] bg-[rgba(22,27,38,0.58)] p-[18px] shadow-[var(--shadow-soft)] max-[720px]:p-4"
              aria-label="cart layout"
            >
              <div className="flex items-center justify-between gap-3 max-[720px]:flex-col max-[720px]:items-stretch">
                <div>
                  <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Current Bill</p>
                  <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-white">โต๊ะ A12</strong>
                </div>
                <StatusPill>3 รายการ</StatusPill>
              </div>

              <div className="grid min-h-0 content-start gap-3">
                {[
                  ["ข้าวกะเพราหมู", "1 x 65", "65"],
                  ["ชาไทยเย็น", "2 x 45", "90"],
                  ["บราวนี่", "1 x 49", "49"],
                ].map(([name, qty, total]) => (
                  <div
                    key={name}
                    className="grid grid-cols-[60px_minmax(0,1fr)_42px] items-center gap-3 rounded-2xl border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.03)] p-[10px]"
                  >
                    <div className="h-[60px] w-[60px] rounded-2xl border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.04)]" />
                    <div className="grid gap-2.5">
                      <strong className="text-base leading-[1.2] text-white">{name}</strong>
                      <span className="m-0 text-[0.95rem] text-[var(--foreground-soft)]">{qty}</span>
                    </div>
                    <b className="text-base leading-[1.2] text-white">฿{total}</b>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 border-t border-t-[var(--border)] pt-2">
                {[
                  ["ยอดรวม", "฿204"],
                  ["ส่วนลด", "฿0"],
                  ["ภาษี", "฿14"],
                  ["สุทธิ", "฿218"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 max-[720px]:flex-col max-[720px]:items-stretch">
                    <span className="m-0 text-[0.95rem] text-[var(--foreground-soft)]">{label}</span>
                    <strong className="text-base leading-[1.2] text-white">{value}</strong>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
                <button
                  type="button"
                  className="inline-flex h-[52px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[rgba(22,27,38,0.8)] px-[18px] font-bold text-[var(--foreground-soft)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[rgba(0,0,0,0.15)_0_5px_10px]"
                >
                  ล้างบิล
                </button>
                <button
                  type="button"
                  className="inline-flex h-[52px] items-center justify-center rounded-2xl border border-transparent bg-[linear-gradient(135deg,var(--brand)_0%,#8070f0_100%)] px-[18px] font-bold text-white shadow-[rgba(108,92,231,0.18)_0_6px_14px] transition hover:-translate-y-px"
                >
                  ยืนยันออเดอร์
                </button>
              </div>
            </aside>
          </div>
        </section>
      ),
      standalone: true,
    },
    payments: {
      eyebrow: "Checkout",
      title: "ชำระเงิน",
      description: "สรุปยอดชำระ วิธีรับเงิน และทางลัดฝั่งแคชเชียร์ในพื้นที่เดียว",
      actions: <StatusPill>บิลล่าสุด 1,280 บาท</StatusPill>,
      body: (
        <SectionGrid>
          <PanelCard eyebrow="Bill Summary" title="ยอดที่ต้องรับ" description="ค่าสินค้า ภาษี ส่วนลด และยอดสุทธิ" className="px-[18px] py-4">
            <DataStack
              items={[
                ["ค่าอาหาร", "1,120 บาท"],
                ["ค่าบริการ", "80 บาท"],
                ["ส่วนลดสมาชิก", "-40 บาท"],
                ["ยอดสุทธิ", "1,160 บาท"],
              ]}
            />
          </PanelCard>

          <PanelCard eyebrow="Payment Actions" title="เลือก flow การชำระ" description="ส่วนนี้โต้ตอบได้โดยไม่กระทบ shell หลัก" className="px-[18px] py-4">
            <InteractiveActionGrid items={["เงินสด", "โอนเงิน", "บัตร", "แยกบิล", "คืนเงิน", "พิมพ์สลิป"]} />
          </PanelCard>
        </SectionGrid>
      ),
    },
    receipts: {
      eyebrow: "Receipt Desk",
      title: "ใบเสร็จ",
      description: "รวมการค้นบิล ซ้ำพิมพ์ และส่งสลิปแบบย่อในจอเดียว",
      actions: <StatusPill>พร้อมพิมพ์ 12 รายการ</StatusPill>,
      body: (
        <SectionGrid>
          <PanelCard eyebrow="Recent Receipts" title="บิลล่าสุด" description="ค้นบิลได้จากรายการสั้น" className="px-[18px] py-4">
            <ListStack
              items={[
                { title: "RC-1042", subtitle: "โต๊ะ A03", value: "1,280 บาท" },
                { title: "RC-1041", subtitle: "กลับบ้าน", value: "245 บาท" },
                { title: "RC-1040", subtitle: "โต๊ะ C01", value: "3,450 บาท" },
              ]}
            />
          </PanelCard>

          <PanelCard eyebrow="Print & Share" title="งานหลังปิดบิล" description="ปุ่มเหล่านี้แยกเป็น client island" className="px-[18px] py-4">
            <InteractiveActionGrid items={["พิมพ์ซ้ำ", "ส่งอีเมล", "ส่งไลน์", "ดูรายละเอียด"]} columns={2} />
          </PanelCard>
        </SectionGrid>
      ),
    },
    reports: {
      eyebrow: "Reports",
      title: "รายงาน",
      description: "มุมมองอ่านเร็วสำหรับยอดขาย บิลเฉลี่ย และสิ่งที่ต้องจับตาในวันเดียว",
      actions: <StatusPill tone="success">อัปเดตล่าสุด 5 นาทีที่แล้ว</StatusPill>,
      body: (
        <SectionGrid>
          <PanelCard eyebrow="Today" title="ตัวชี้วัดสำคัญวันนี้" description="ตัวเลขหลักที่เจ้าของร้านใช้ตัดสินใจ" className="px-[18px] py-4">
            <ThreeUpStats items={[["ยอดขาย", "28,450"], ["บิลเฉลี่ย", "412"], ["ช่วงพีค", "12:30"]]} />
          </PanelCard>

          <PanelCard eyebrow="Highlights" title="สิ่งที่ต้องจับตา" description="แทนกราฟยาวด้วยโน้ตที่อ่านจบเร็ว" className="px-[18px] py-4">
            <NoteStack
              items={[
                "สินค้าขายดีที่สุดวันนี้คือ American Fried Rice",
                "ยอดขายเครื่องดื่มเพิ่มขึ้น 14% จากเมื่อวาน",
                "สาขานี้มี 3 บิลที่ยังไม่ปิดเก็บเงิน",
              ]}
            />
          </PanelCard>
        </SectionGrid>
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
      actions: <StatusPill>{storeName}</StatusPill>,
      body: (
        <SectionGrid>
          <PanelCard eyebrow="Store Pulse" title="สถานะวันนี้" description="ตัวเลขหลักของร้านในวันเดียว" className="px-[18px] py-4">
            <ThreeUpStats items={[["ออเดอร์เปิด", "8"], ["ยอดขายสด", "28.4K"], ["พนักงานเข้าเวร", "6"]]} />
          </PanelCard>

          <PanelCard eyebrow="Owner Notes" title="สิ่งที่ควรเช็กวันนี้" description="โน้ตสั้นสำหรับผู้ดูแลร้าน" className="px-[18px] py-4">
            <NoteStack
              items={[
                "ตรวจ stock วัตถุดิบที่ใช้กับสินค้าขายดีช่วงเที่ยง",
                "ตามบิลค้างชำระ 1 บิลจากเดลิเวอรี",
                "อัปเดตสินค้าโปรโมชั่นก่อนรอบเย็น",
              ]}
            />
          </PanelCard>
        </SectionGrid>
      ),
    },
    settings: {
      eyebrow: "Store Settings",
      title: "ตั้งค่าร้าน",
      description: "หน้า owner settings นี้แยกฟอร์ม interactive ออกเป็น client components โดยคง shell ฝั่ง server ไว้ให้เบา",
      actions: <StatusPill tone="success">พร้อมใช้งานแล้ว</StatusPill>,
      body: (
        <SectionGrid>
          <PanelCard eyebrow="ความปลอดภัยของบัญชี" title="เปลี่ยนรหัสผ่าน" description="เฉพาะบล็อกฟอร์มนี้ที่เป็น client-side" className="px-[18px] py-4">
            <OwnerPasswordClient />
          </PanelCard>

          <PanelCard eyebrow="โปรไฟล์ร้านค้า" title="ข้อมูลทั่วไป" description="แก้ชื่อร้านและเจ้าของได้โดยไม่ลากทั้งหน้าไปเป็น client" className="px-[18px] py-4">
            <OwnerProfileClient storeName={storeName} ownerName={ownerName} />
          </PanelCard>
        </SectionGrid>
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
    <main className="h-screen overflow-hidden max-[1180px]:h-auto max-[1180px]:overflow-auto">
      <div className="mx-auto h-screen w-[min(1400px,calc(100%-32px))] px-0 py-3 max-[1180px]:h-auto max-[1180px]:py-3 max-[720px]:w-[min(100%-20px,100%)] max-[720px]:pt-2.5">
        <BackofficeShell
          className="h-[calc(100vh-24px)] max-[1180px]:h-auto"
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
            <div className="grid grid-cols-2 gap-[18px] max-[1180px]:grid-cols-1">
              <PanelCard eyebrow="Store Snapshot" title="สถานะการใช้งาน" description="ข้อมูลของร้านเท่านั้น ไม่ปะปนงานระดับ platform" className="px-[18px] py-4">
                <ThreeUpStats items={[["ร้าน", storeName], ["ผู้ใช้", ownerName], ["Session", "Secure"]]} />
              </PanelCard>

              <PanelCard eyebrow="Render Strategy" title="Owner Interactive Islands" description="เฉพาะปุ่มและฟอร์มที่ต้องโต้ตอบถูกแยกเป็น client components" className="px-[18px] py-4">
                <NoteStack
                  items={[
                    "shell หลัก, nav และ data summary ยัง render ฝั่ง server",
                    "action grid และ forms ย้ายไปเป็น client islands เพื่อแยก logic ให้ดูแลง่าย",
                  ]}
                />
              </PanelCard>
            </div>
          ) : null}
        </BackofficeShell>
      </div>
    </main>
  );
}
