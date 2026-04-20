import type { ReactNode } from "react";
import type { SessionPayload } from "@/lib/session";
import { BackofficeShell, PanelCard } from "@/components/backoffice-shell";
import { LogoutButton } from "@/components/logout-button";
import { InteractiveActionGrid } from "@/components/interactive-action-grid";
import { OwnerPasswordClient, OwnerProfileClient } from "@/components/owner-settings-client";
import { ProductManagementStudio } from "@/components/product-management-studio";
import { ListStack, NoteStack, ThreeUpStats } from "@/components/owner-workspace/shared";
import { SalesPaginationMockup } from "@/components/sales-pagination-mockup";
import { PageHeader, StatusPill, ghostButtonClass, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui-primitives";

export type OwnerSectionKey = "sales" | "payments" | "receipts" | "reports" | "menu" | "overview" | "calculator" | "settings";

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
  calculator: { label: "คำนวณ", href: "/owner/calculator" },
  settings: { label: "ตั้งค่า", href: "/owner/settings" },
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
          <PageHeader
            eyebrow="Sales Floor"
            title="ขายหน้าร้าน"
            actions={
              <>
              <div className="h-5 w-[72px] rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.06)] max-[720px]:w-full" />
              <div className="h-5 w-[136px] rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.06)] max-[720px]:w-full" />
              </>
            }
          />

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

              <SalesPaginationMockup />
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
        <section
          className="grid h-full min-h-0 grid-rows-[156px_minmax(0,1fr)] gap-[18px] max-[1180px]:grid-rows-[auto_minmax(0,1fr)]"
          aria-label="payment layout"
        >
          <PageHeader
            eyebrow="Checkout"
            title="ชำระเงิน"
            actions={
              <>
                <StatusPill tone="success">พร้อมรับชำระ</StatusPill>
                <div className="h-5 w-[124px] rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.06)] max-[720px]:w-full" />
              </>
            }
          />

          <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px] gap-[18px] max-[1280px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] max-[1180px]:grid-cols-1">
            <section className="grid min-h-0 grid-rows-[auto_auto_1fr_auto] gap-[16px] rounded-[18px] border border-[var(--border)] bg-[rgba(22,27,38,0.76)] px-5 py-[18px] shadow-[var(--shadow-soft)]">
              <div>
                <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Bill Summary</p>
                <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-white">ค่าใช้จ่ายบิล A12</strong>
                <p className="m-0 text-[0.95rem] leading-[1.65] text-[var(--foreground-soft)]">สรุปรายการสินค้า จำนวน และยอดสุทธิก่อนปิดบิล</p>
              </div>

              <div className="grid gap-3">
                {[
                  ["ข้าวกะเพราหมู", "1 x 65", "฿65"],
                  ["ชาไทยเย็น", "2 x 45", "฿90"],
                  ["บราวนี่", "1 x 49", "฿49"],
                ].map(([name, qty, total]) => (
                  <div key={name} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.03)] p-3">
                    <div className="h-[52px] w-[52px] rounded-2xl border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.04)]" />
                    <div className="grid gap-1">
                      <strong className="text-base leading-[1.2] text-white">{name}</strong>
                      <span className="text-[0.92rem] text-[var(--foreground-soft)]">{qty}</span>
                    </div>
                    <strong className="text-base leading-[1.2] text-white">{total}</strong>
                  </div>
                ))}
              </div>

              <div className="grid gap-3">
                <label className="grid gap-2">
                  <span className="text-[0.92rem] text-[var(--foreground-soft)]">ชื่อลูกค้า</span>
                  <input className={inputClass} defaultValue="Walk-in Customer" />
                </label>
                <label className="grid gap-2">
                  <span className="text-[0.92rem] text-[var(--foreground-soft)]">หมายเหตุบิล</span>
                  <textarea
                    className="min-h-[116px] rounded-[14px] border border-[rgba(100,120,160,0.22)] bg-[rgba(14,18,28,0.7)] px-[14px] py-3 text-[var(--foreground)] outline-none transition placeholder:text-[#556070] focus:border-[rgba(108,92,231,0.55)] focus:shadow-[inset_0_0_0_1px_var(--ring)]"
                    defaultValue="ลูกค้ากลับบ้าน รอออกใบเสร็จย่อ"
                  />
                </label>
              </div>

              <div className="grid gap-3 border-t border-t-[var(--border)] pt-3">
                {[
                  ["ยอดอาหาร", "฿204"],
                  ["ภาษี", "฿14"],
                  ["ส่วนลด", "฿0"],
                  ["สุทธิ", "฿218"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-[0.95rem] text-[var(--foreground-soft)]">{label}</span>
                    <strong className="text-base leading-[1.2] text-white">{value}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid min-h-0 grid-rows-[auto_auto_1fr_auto] gap-[16px] rounded-[18px] border border-[var(--border)] bg-[rgba(22,27,38,0.76)] px-5 py-[18px] shadow-[var(--shadow-soft)]">
              <div>
                <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Payment Methods</p>
                <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-white">เลือกวิธีชำระ</strong>
                <p className="m-0 text-[0.95rem] leading-[1.65] text-[var(--foreground-soft)]">รองรับเงินสด โอน บัตร และการแยกบิล</p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
                {["เงินสด", "QR PromptPay", "บัตร", "โอนเงิน"].map((method, index) => (
                  <button
                    key={method}
                    type="button"
                    className={index === 0 ? `${primaryButtonClass} min-h-[52px] rounded-2xl` : `${secondaryButtonClass} min-h-[52px] rounded-2xl`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              <div className="grid content-start gap-4">
                <label className="grid gap-2">
                  <span className="text-[0.92rem] text-[var(--foreground-soft)]">รับเงินจากลูกค้า</span>
                  <input className={inputClass} defaultValue="500" />
                </label>
                <label className="grid gap-2">
                  <span className="text-[0.92rem] text-[var(--foreground-soft)]">เงินทอน</span>
                  <input className={inputClass} defaultValue="282" />
                </label>
                <label className="grid gap-2">
                  <span className="text-[0.92rem] text-[var(--foreground-soft)]">Reference / สลิป</span>
                  <div className="flex min-h-[116px] items-center justify-center rounded-[14px] border border-dashed border-[rgba(100,120,160,0.22)] bg-[rgba(255,255,255,0.03)] text-[0.95rem] text-[var(--foreground-soft)]">
                    พื้นที่อัปโหลดสลิป / หมายเลขอ้างอิง
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
                <button type="button" className={`${ghostButtonClass} min-h-[52px] rounded-2xl`}>
                  ยกเลิก
                </button>
                <button type="button" className={`${primaryButtonClass} min-h-[52px] rounded-2xl`}>
                  ยืนยันการชำระ
                </button>
              </div>
            </section>

            <section className="grid h-fit gap-[16px] rounded-[18px] border border-[var(--border)] bg-[rgba(22,27,38,0.76)] px-5 py-[18px] shadow-[var(--shadow-soft)] max-[1280px]:col-span-2 max-[1180px]:col-span-1">
              <div>
                <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Quick Panel</p>
                <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-white">ทางลัดแคชเชียร์</strong>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.03)] p-4">
                  <span className="text-[0.92rem] text-[var(--foreground-soft)]">สถานะบิล</span>
                  <strong className="mt-2 block text-[1.2rem] leading-[1.1] text-white">รอชำระ โต๊ะ A12</strong>
                </div>
                <div className="rounded-2xl border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.03)] p-4">
                  <span className="text-[0.92rem] text-[var(--foreground-soft)]">จำนวนรายการ</span>
                  <strong className="mt-2 block text-[1.2rem] leading-[1.1] text-white">3 รายการ / 4 ชิ้น</strong>
                </div>
              </div>

              <div className="grid gap-3">
                <button type="button" className={`${secondaryButtonClass} min-h-[48px] rounded-2xl`}>
                  พิมพ์ใบเสร็จ
                </button>
                <button type="button" className={`${secondaryButtonClass} min-h-[48px] rounded-2xl`}>
                  แยกบิล
                </button>
                <button type="button" className={`${secondaryButtonClass} min-h-[48px] rounded-2xl`}>
                  คืนเงิน
                </button>
              </div>
            </section>
          </div>
        </section>
      ),
      standalone: true,
    },
    receipts: {
      eyebrow: "Receipt Desk",
      title: "ใบเสร็จ",
      description: "รวมการค้นบิล ซ้ำพิมพ์ และส่งสลิปแบบย่อในจอเดียว",
      actions: <StatusPill>พร้อมพิมพ์ 12 รายการ</StatusPill>,
      body: (
        <section className="grid h-full min-h-0 grid-rows-[156px_minmax(0,1fr)] gap-[18px] max-[1180px]:grid-rows-[auto_minmax(0,1fr)]">
          <PageHeader
            eyebrow="Receipt Desk"
            title="ใบเสร็จ"
            actions={
              <>
                <StatusPill>พร้อมพิมพ์ 12 รายการ</StatusPill>
                <div className="h-5 w-[128px] rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.06)] max-[720px]:w-full" />
              </>
            }
          />

          <div className="grid min-h-0 grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] gap-[18px] max-[1180px]:grid-cols-1">
            <PanelCard eyebrow="Recent Receipts" title="บิลล่าสุด" description="ค้นบิลได้จากรายการสั้น" className="grid min-h-0 content-start px-[18px] py-4">
              <div className="grid gap-[18px]">
                <ListStack
                  items={[
                    { title: "RC-1042", subtitle: "โต๊ะ A03", value: "1,280 บาท" },
                    { title: "RC-1041", subtitle: "กลับบ้าน", value: "245 บาท" },
                    { title: "RC-1040", subtitle: "โต๊ะ C01", value: "3,450 บาท" },
                  ]}
                />
                <div className="grid gap-[10px] rounded-[16px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(100,120,160,0.12)] bg-[rgba(22,27,38,0.56)] px-4 py-3">
                    <span className="text-[var(--foreground-soft)]">ค้นหาจากเลขบิล</span>
                    <strong>RC-1042</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(100,120,160,0.12)] bg-[rgba(22,27,38,0.56)] px-4 py-3">
                    <span className="text-[var(--foreground-soft)]">ประเภท</span>
                    <strong>รับประทานที่ร้าน</strong>
                  </div>
                </div>
              </div>
            </PanelCard>

            <PanelCard eyebrow="Print & Share" title="งานหลังปิดบิล" description="พิมพ์ซ้ำ ส่งต่อ และดูตัวอย่างใบเสร็จ" className="grid min-h-0 content-start px-[18px] py-4">
              <div className="grid gap-[18px]">
                <div className="min-h-[240px] rounded-[18px] border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="mx-auto max-w-[240px] rounded-[18px] border border-[rgba(100,120,160,0.14)] bg-[rgba(14,18,28,0.72)] p-4 text-center">
                    <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Receipt Preview</p>
                    <strong className="mt-3 block text-[1.15rem]">RC-1042</strong>
                    <p className="mt-2 text-[0.9rem] text-[var(--foreground-soft)]">Main Store · โต๊ะ A03</p>
                    <div className="mt-4 grid gap-2 text-left text-[0.9rem] text-[var(--foreground-soft)]">
                      <div className="flex items-center justify-between"><span>ข้าวกะเพรา</span><span>฿65</span></div>
                      <div className="flex items-center justify-between"><span>ชาไทยเย็น</span><span>฿90</span></div>
                      <div className="flex items-center justify-between"><span>สุทธิ</span><strong className="text-white">฿155</strong></div>
                    </div>
                  </div>
                </div>
                <InteractiveActionGrid items={["พิมพ์ซ้ำ", "ส่งอีเมล", "ส่งไลน์", "ดูรายละเอียด"]} columns={2} />
              </div>
            </PanelCard>
          </div>
        </section>
      ),
      standalone: true,
    },
    reports: {
      eyebrow: "Reports",
      title: "รายงาน",
      description: "มุมมองอ่านเร็วสำหรับยอดขาย บิลเฉลี่ย และสิ่งที่ต้องจับตาในวันเดียว",
      actions: <StatusPill tone="success">อัปเดตล่าสุด 5 นาทีที่แล้ว</StatusPill>,
      body: (
        <section className="grid h-full min-h-0 grid-rows-[156px_minmax(0,1fr)] gap-[18px] max-[1180px]:grid-rows-[auto_minmax(0,1fr)]">
          <PageHeader
            eyebrow="Reports"
            title="รายงาน"
            actions={
              <>
                <StatusPill tone="success">อัปเดตล่าสุด 5 นาทีที่แล้ว</StatusPill>
                <div className="h-5 w-[132px] rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.06)] max-[720px]:w-full" />
              </>
            }
          />

          <div className="grid min-h-0 grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] gap-[18px] max-[1180px]:grid-cols-1">
            <PanelCard eyebrow="Today" title="ตัวชี้วัดสำคัญวันนี้" description="ตัวเลขหลักที่เจ้าของร้านใช้ตัดสินใจ" className="grid min-h-0 content-start px-[18px] py-4">
              <div className="grid gap-[18px]">
                <ThreeUpStats items={[["ยอดขาย", "28,450"], ["บิลเฉลี่ย", "412"], ["ช่วงพีค", "12:30"]]} />
                <div className="grid gap-[10px] rounded-[16px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
                  {[
                    ["ยอดเช้า", "8,450 บาท"],
                    ["ยอดเที่ยง", "12,280 บาท"],
                    ["ยอดเย็น", "7,720 บาท"],
                    ["บิลที่ยังไม่ปิด", "3 บิล"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(100,120,160,0.12)] bg-[rgba(22,27,38,0.56)] px-4 py-3">
                      <span className="text-[var(--foreground-soft)]">{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </PanelCard>

            <PanelCard eyebrow="Highlights" title="สิ่งที่ต้องจับตา" description="แทนกราฟยาวด้วยโน้ตที่อ่านจบเร็ว" className="grid min-h-0 content-start px-[18px] py-4">
              <div className="grid gap-[18px]">
                <NoteStack
                  items={[
                    "สินค้าขายดีที่สุดวันนี้คือ American Fried Rice",
                    "ยอดขายเครื่องดื่มเพิ่มขึ้น 14% จากเมื่อวาน",
                    "สาขานี้มี 3 บิลที่ยังไม่ปิดเก็บเงิน",
                  ]}
                />
                <ListStack
                  items={[
                    { title: "12:30", subtitle: "ช่วงพีคของวัน", value: "67 ออเดอร์" },
                    { title: "AOV", subtitle: "ค่าเฉลี่ยต่อบิล", value: "412 บาท" },
                  ]}
                />
              </div>
            </PanelCard>
          </div>
        </section>
      ),
      standalone: true,
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
        <section className="grid h-full min-h-0 grid-rows-[156px_minmax(0,1fr)] gap-[18px] max-[1180px]:grid-rows-[auto_minmax(0,1fr)]">
          <PageHeader
            eyebrow="Overview"
            title="ภาพรวมร้าน"
            actions={
              <>
                <StatusPill>{storeName}</StatusPill>
                <div className="h-5 w-[112px] rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.06)] max-[720px]:w-full" />
              </>
            }
          />

          <div className="grid min-h-0 grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] gap-[18px] max-[1180px]:grid-cols-1">
            <PanelCard eyebrow="Store Pulse" title="สถานะวันนี้" description="ตัวเลขหลักของร้านในวันเดียว" className="grid min-h-0 content-start px-[18px] py-4">
              <div className="grid gap-[18px]">
                <ThreeUpStats items={[["ออเดอร์เปิด", "8"], ["ยอดขายสด", "28.4K"], ["พนักงานเข้าเวร", "6"]]} />
                <div className="grid gap-[10px] rounded-[16px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
                  {[
                    ["โต๊ะที่กำลังใช้งาน", "5 โต๊ะ"],
                    ["ลูกค้ารอชำระ", "2 บิล"],
                    ["สินค้าต้องเติม", "4 รายการ"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(100,120,160,0.12)] bg-[rgba(22,27,38,0.56)] px-4 py-3">
                      <span className="text-[var(--foreground-soft)]">{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </PanelCard>

            <PanelCard eyebrow="Owner Notes" title="สิ่งที่ควรเช็กวันนี้" description="โน้ตสั้นสำหรับผู้ดูแลร้าน" className="grid min-h-0 content-start px-[18px] py-4">
              <div className="grid gap-[18px]">
                <NoteStack
                  items={[
                    "ตรวจ stock วัตถุดิบที่ใช้กับสินค้าขายดีช่วงเที่ยง",
                    "ตามบิลค้างชำระ 1 บิลจากเดลิเวอรี",
                    "อัปเดตสินค้าโปรโมชั่นก่อนรอบเย็น",
                  ]}
                />
                <ListStack
                  items={[
                    { title: "5 นาที", subtitle: "อัปเดตรอบล่าสุด", value: "พร้อมใช้งาน" },
                    { title: "6 คน", subtitle: "พนักงานเข้าเวร", value: "ครบทีม" },
                  ]}
                />
              </div>
            </PanelCard>
          </div>
        </section>
      ),
      standalone: true,
    },
    calculator: {
      eyebrow: "Cost Calculator",
      title: "คำนวณ",
      description: "ช่วยคำนวณต้นทุน ราคาขาย และกำไรขั้นต้นสำหรับสินค้าแต่ละรายการ",
      actions: <StatusPill tone="success">พร้อมคำนวณ</StatusPill>,
      body: (
        <section className="grid h-full min-h-0 grid-rows-[156px_minmax(0,1fr)] gap-[18px] max-[1180px]:grid-rows-[auto_minmax(0,1fr)]">
          <PageHeader
            eyebrow="Cost Calculator"
            title="คำนวณ"
            actions={
              <>
                <StatusPill tone="success">พร้อมคำนวณ</StatusPill>
                <div className="h-5 w-[120px] rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.06)] max-[720px]:w-full" />
              </>
            }
          />

          <div className="grid min-h-0 grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-[18px] max-[1180px]:grid-cols-1">
            <PanelCard eyebrow="Cost Inputs" title="ข้อมูลต้นทุน" description="กรอกต้นทุนต่อหน่วย ค่าบรรจุภัณฑ์ และราคาขายที่ต้องการ" className="grid min-h-0 content-start px-[18px] py-4">
              <div className="grid gap-[14px]">
                {[
                  ["ต้นทุนวัตถุดิบ", "85"],
                  ["ค่าบรรจุภัณฑ์", "12"],
                  ["ค่าแรงเฉลี่ยต่อชิ้น", "18"],
                  ["ราคาขาย", "159"],
                ].map(([label, value]) => (
                  <label key={label} className="grid gap-2">
                    <span className="text-[0.92rem] text-[var(--foreground-soft)]">{label}</span>
                    <input className={inputClass} defaultValue={value} />
                  </label>
                ))}
              </div>
            </PanelCard>

            <PanelCard eyebrow="Profit Snapshot" title="สรุปกำไร" description="คำนวณเบื้องต้นเพื่อใช้ตั้งราคาขายหรือปรับโปรโมชั่น" className="grid min-h-0 content-start px-[18px] py-4">
              <div className="grid gap-[18px]">
                <ThreeUpStats items={[["ต้นทุนรวม", "115"], ["กำไรขั้นต้น", "44"], ["Margin", "27.7%"]]} />
                <div className="grid gap-[10px] rounded-[16px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(100,120,160,0.12)] bg-[rgba(22,27,38,0.56)] px-4 py-3">
                    <span className="text-[var(--foreground-soft)]">ราคาขายแนะนำ</span>
                    <strong>฿169</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(100,120,160,0.12)] bg-[rgba(22,27,38,0.56)] px-4 py-3">
                    <span className="text-[var(--foreground-soft)]">Break-even</span>
                    <strong>฿115</strong>
                  </div>
                </div>
              </div>
            </PanelCard>
          </div>
        </section>
      ),
      standalone: true,
    },
    settings: {
      eyebrow: "Store Settings",
      title: "ตั้งค่าร้าน",
      description: "หน้า owner settings นี้แยกฟอร์ม interactive ออกเป็น client components โดยคง shell ฝั่ง server ไว้ให้เบา",
      actions: <StatusPill tone="success">พร้อมใช้งานแล้ว</StatusPill>,
      body: (
        <section className="grid h-full min-h-0 grid-rows-[156px_minmax(0,1fr)] gap-[18px] max-[1180px]:grid-rows-[auto_minmax(0,1fr)]">
          <PageHeader
            eyebrow="Store Settings"
            title="ตั้งค่าร้าน"
            actions={
              <>
                <StatusPill tone="success">พร้อมใช้งานแล้ว</StatusPill>
                <div className="h-5 w-[120px] rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.06)] max-[720px]:w-full" />
              </>
            }
          />

          <div className="grid min-h-0 grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] gap-[18px] max-[1180px]:grid-cols-1">
            <PanelCard eyebrow="ความปลอดภัยของบัญชี" title="เปลี่ยนรหัสผ่าน" description="เฉพาะบล็อกฟอร์มนี้ที่เป็น client-side" className="grid min-h-0 content-start px-[18px] py-4">
              <OwnerPasswordClient />
            </PanelCard>

            <PanelCard eyebrow="โปรไฟล์ร้านค้า" title="ข้อมูลทั่วไป" description="แก้ชื่อร้านและเจ้าของได้โดยไม่ลากทั้งหน้าไปเป็น client" className="grid min-h-0 content-start px-[18px] py-4">
              <div className="grid gap-[18px]">
                <OwnerProfileClient storeName={storeName} ownerName={ownerName} />
                <div className="grid gap-[10px] rounded-[16px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(100,120,160,0.12)] bg-[rgba(22,27,38,0.56)] px-4 py-3">
                    <span className="text-[var(--foreground-soft)]">การเชื่อมต่อเครื่องพิมพ์</span>
                    <strong>พร้อมใช้งาน</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(100,120,160,0.12)] bg-[rgba(22,27,38,0.56)] px-4 py-3">
                    <span className="text-[var(--foreground-soft)]">รอบอัปเดตล่าสุด</span>
                    <strong>วันนี้ 10:24</strong>
                  </div>
                </div>
              </div>
            </PanelCard>
          </div>
        </section>
      ),
      standalone: true,
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

