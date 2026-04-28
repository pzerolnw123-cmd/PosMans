import type { ReactNode } from "react";
import { PanelCard } from "@/components/backoffice-shell";
import {
  OwnerLogoClient,
  OwnerLogoStatusPill,
  OwnerPasswordClient,
  OwnerPaymentSettingsClient,
  OwnerProfileClient,
  OwnerThemeClient,
  OwnerThemeStatusPill,
  type OwnerPaymentSettingsValue,
} from "@/components/owner-settings-client";
import { PaymentCheckoutClient } from "@/components/payment-checkout-client";
import { ProductManagementStudio } from "@/components/product-management-studio";
import { ReceiptDeskClient } from "@/components/receipt-desk-client";
import { ListStack, NoteStack, ThreeUpStats } from "@/components/owner-workspace/shared";
import { SalesPaginationMockup } from "@/components/sales-pagination-mockup";
import { PageHeader, StatusPill, inputClass } from "@/components/ui-primitives";
import type { OwnerSectionKey } from "@/components/owner-workspace";

const storeNamePrompt = "กรอกชื่อร้าน";
const ownerNamePrompt = "กรอกชื่อของคุณ";

export function renderOwnerScreen(
  activeSection: OwnerSectionKey,
  storeName: string,
  ownerName: string,
  formStoreName: string,
  formOwnerName: string,
  paymentSettings: OwnerPaymentSettingsValue,
) {
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
            description="จัดการรายการขายหน้าร้านของคุณ เลือกสินค้า เพิ่มลงตะกร้า และติดตามบิลที่กำลังขาย พร้อมเข้าสู่ขั้นตอนชำระเงินได้อย่างรวดเร็ว"
            actions={<StatusPill tone="success">พร้อมขายแล้ว</StatusPill>}
            className="h-[138px] min-h-[138px] max-h-[138px] px-5 py-5 max-[1180px]:h-auto max-[1180px]:min-h-0 max-[1180px]:max-h-none max-[1024px]:px-4 max-[1024px]:py-4 max-[640px]:px-3.5 max-[640px]:py-3.5 h-[144px] min-h-[144px] max-h-[144px] px-4 py-4 max-[1180px]:h-auto max-[1180px]:min-h-0 max-[1180px]:max-h-none max-[640px]:px-3.5 max-[640px]:py-3.5"
          />

          <SalesPaginationMockup />
        </section>
      ),
      standalone: true,
    },
    payments: {
      eyebrow: "Checkout",
      title: "ชำระเงิน",
      description: "รับตะกร้าจากหน้าขาย เลือกวิธีรับเงิน ใส่ส่วนลดหรือภาษี แล้วบันทึกบิลจริง",
      actions: <StatusPill tone="success">พร้อมรับชำระ</StatusPill>,
      body: (
        <section
          className="grid h-full min-h-0 grid-rows-[156px_minmax(0,1fr)] gap-[18px] max-[1180px]:grid-rows-[auto_minmax(0,1fr)]"
          aria-label="payment layout"
        >
          <PageHeader
            eyebrow="Checkout"
            title="ชำระเงิน"
            description="ตรวจรายการจากตะกร้า เลือกวิธีชำระเงิน และบันทึกบิลขายให้เรียบร้อย"
            actions={<StatusPill tone="success">พร้อมรับชำระ</StatusPill>}
          />

          <PaymentCheckoutClient paymentSettings={paymentSettings} />
        </section>
      ),
      standalone: true,
    },
    receipts: {
      eyebrow: "Receipt Desk",
      title: "ใบเสร็จ",
      description: "รวมการค้นบิล ซ้ำพิมพ์ และส่งสลิปแบบย่อในจอเดียว",
      actions: <StatusPill tone="success">เชื่อมบิลขายจริง</StatusPill>,
      body: (
        <section className="grid h-full min-h-0 grid-rows-[156px_minmax(0,1fr)] gap-[18px] max-[1180px]:grid-rows-[auto_minmax(0,1fr)] max-[820px]:gap-4">
          <PageHeader
            eyebrow="Receipt Desk"
            title="ใบเสร็จ"
            description="ค้นหาบิลขายที่ปิดแล้ว ดูรายละเอียด พิมพ์ซ้ำ และคัดลอกข้อมูลให้ลูกค้า"
            actions={<StatusPill tone="success">ใช้ข้อมูลจริง</StatusPill>}
          />

          <ReceiptDeskClient />
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
        <section className="grid h-full min-h-0 grid-rows-[138px_minmax(0,1fr)] gap-[14px] max-[1180px]:grid-rows-[auto_minmax(0,1fr)] max-[820px]:gap-4">
          <PageHeader
            eyebrow="Reports"
            title="รายงาน"
            actions={
              <>
                <StatusPill tone="success">อัปเดตล่าสุด 5 นาทีที่แล้ว</StatusPill>
                <div className="h-5 w-[132px] rounded-full border border-[var(--border)] bg-[var(--overlay-white-06)] max-[720px]:w-full" />
              </>
            }
          />

          <div className="grid min-h-0 grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] gap-[18px] max-[1280px]:grid-cols-1">
            <PanelCard eyebrow="Today" title="ตัวชี้วัดสำคัญวันนี้" description="ตัวเลขหลักที่เจ้าของร้านใช้ตัดสินใจ" className="grid min-h-0 content-start px-[18px] py-4">
              <div className="grid gap-[18px]">
                <ThreeUpStats items={[["ยอดขาย", "28,450"], ["บิลเฉลี่ย", "412"], ["ช่วงพีค", "12:30"]]} />
                <div className="grid gap-[10px] rounded-[16px] border border-[var(--border)] bg-[var(--panel-subtle)] p-4">
                  {[
                    ["ยอดเช้า", "8,450 บาท"],
                    ["ยอดเที่ยง", "12,280 บาท"],
                    ["ยอดเย็น", "7,720 บาท"],
                    ["บิลที่ยังไม่ปิด", "3 บิล"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-muted)] px-4 py-3">
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
        <section className="grid h-full min-h-0 grid-rows-[140px_minmax(0,1fr)] gap-[12px] max-[1180px]:grid-rows-[auto_minmax(0,1fr)] max-[820px]:gap-4">
          <PageHeader
            eyebrow="Overview"
            title="ภาพรวมร้าน"
            actions={
              <>
                <StatusPill>{storeName}</StatusPill>
                <div className="h-5 w-[112px] rounded-full border border-[var(--border)] bg-[var(--overlay-white-06)] max-[720px]:w-full" />
              </>
            }
          />

          <div className="grid min-h-0 grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] gap-[18px] max-[1280px]:grid-cols-1">
            <PanelCard eyebrow="Store Pulse" title="สถานะวันนี้" description="ตัวเลขหลักของร้านในวันเดียว" className="grid min-h-0 content-start px-[18px] py-4">
              <div className="grid gap-[18px]">
                <ThreeUpStats items={[["ออเดอร์เปิด", "8"], ["ยอดขายสด", "28.4K"], ["พนักงานเข้าเวร", "6"]]} />
                <div className="grid gap-[10px] rounded-[16px] border border-[var(--border)] bg-[var(--panel-subtle)] p-4">
                  {[
                    ["โต๊ะที่กำลังใช้งาน", "5 โต๊ะ"],
                    ["ลูกค้ารอชำระ", "2 บิล"],
                    ["สินค้าต้องเติม", "4 รายการ"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-muted)] px-4 py-3">
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
        <section className="grid h-full min-h-0 grid-rows-[144px_minmax(0,1fr)] gap-[12px] max-[1180px]:grid-rows-[auto_minmax(0,1fr)] max-[820px]:gap-4">
          <PageHeader
            eyebrow="Cost Calculator"
            title="คำนวณ"
            actions={
              <>
                <StatusPill tone="success">พร้อมคำนวณ</StatusPill>
                <div className="h-5 w-[120px] rounded-full border border-[var(--border)] bg-[var(--overlay-white-06)] max-[720px]:w-full" />
              </>
            }
          />

          <div className="grid min-h-0 grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-[18px] max-[1280px]:grid-cols-1">
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
                <div className="grid gap-[10px] rounded-[16px] border border-[var(--border)] bg-[var(--panel-subtle)] p-4">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-muted)] px-4 py-3">
                    <span className="text-[var(--foreground-soft)]">ราคาขายแนะนำ</span>
                    <strong>฿169</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-muted)] px-4 py-3">
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
      description: "จัดการข้อมูลร้าน เจ้าของร้าน และรหัสผ่านของบัญชีนี้",
      actions: <StatusPill tone="success">พร้อมตั้งค่าแล้ว</StatusPill>,
      body: (
        <section className="grid h-full min-h-0 grid-rows-[156px_minmax(0,1fr)] gap-[18px] max-[1180px]:grid-rows-[auto_minmax(0,1fr)]">
          <PageHeader
            eyebrow="Store Settings"
            title="ตั้งค่าร้าน"
            description="จัดการชื่อร้าน ชื่อเจ้าของร้าน และรหัสผ่านของบัญชีเจ้าของร้าน"
            actions={<StatusPill tone="success">พร้อมตั้งค่าแล้ว</StatusPill>}
          />

          <div className="grid min-h-0 grid-cols-[minmax(250px,1fr)_minmax(250px,1fr)_minmax(250px,1fr)] items-start gap-[12px] max-[1366px]:grid-cols-[repeat(2,minmax(250px,1fr))] max-[980px]:grid-cols-1 max-[820px]:gap-4">
            <PanelCard
              eyebrow="ความปลอดภัยของบัญชี"
              title="เปลี่ยนรหัสผ่าน"
              titleClassName="my-[7px] text-[clamp(1.42rem,1.82vw,1.94rem)] leading-[1.05] tracking-[-0.04em]"
              className="grid h-fit min-h-0 content-start px-3.5 py-3.5 max-[820px]:px-3.5 max-[820px]:py-3.5 max-[640px]:px-3 max-[640px]:py-3"
            >
              <OwnerPasswordClient />
            </PanelCard>

            <div className="grid gap-[12px] max-[820px]:gap-4">
              <PanelCard
                eyebrow="โปรไฟล์ร้านค้า"
                title="ข้อมูลทั่วไป"
                titleClassName="my-[7px] text-[clamp(1.28rem,1.55vw,1.66rem)] leading-[1.05] tracking-[-0.035em] max-[520px]:text-[1.48rem]"
                className="grid h-fit min-h-0 min-w-0 content-start overflow-hidden px-3.5 py-3.5 max-[820px]:px-3.5 max-[820px]:py-3.5 max-[640px]:px-3 max-[640px]:py-3"
              >
                <div className="grid gap-[18px]">
                  <OwnerProfileClient
                    storeName={formStoreName}
                    ownerName={formOwnerName}
                    storeNamePlaceholder={storeNamePrompt}
                    ownerNamePlaceholder={ownerNamePrompt}
                  />
                </div>
              </PanelCard>

              <PanelCard
                eyebrow="สัญลักษณ์"
                title="โลโก้ร้าน"
                actions={<OwnerLogoStatusPill />}
                titleClassName="my-[7px] text-[clamp(1.42rem,1.76vw,1.8rem)] leading-[1.05] tracking-[-0.04em]"
                className="grid h-fit min-h-0 min-w-0 content-start px-3.5 py-3.5 max-[820px]:px-3.5 max-[820px]:py-3.5 max-[640px]:px-3 max-[640px]:py-3"
              >
                <OwnerLogoClient />
              </PanelCard>

              <PanelCard
                eyebrow="ธีม"
                title="เปลี่ยนธีม"
                actions={<OwnerThemeStatusPill />}
                titleClassName="my-[8px] text-[clamp(1.5rem,1.9vw,1.8rem)] leading-[1.05] tracking-[-0.04em] max-[520px]:text-[1.68rem]"
                className="grid h-fit min-h-0 min-w-0 content-start overflow-hidden px-4 py-4 max-[820px]:px-4 max-[820px]:py-4 max-[640px]:px-3.5 max-[640px]:py-3.5"
              >
                <OwnerThemeClient />
              </PanelCard>
            </div>

            <div className="grid h-fit min-w-0 gap-[14px] max-[820px]:gap-4">
              <PanelCard
                eyebrow="การรับเงิน"
                title="QR / ข้อมูลโอน"
                titleClassName="my-[8px] text-[clamp(1.26rem,1.46vw,1.38rem)] leading-[1.08] tracking-[-0.03em]"
                className="grid h-fit min-h-0 min-w-0 content-start px-4 py-4 max-[820px]:px-4 max-[820px]:py-4 max-[640px]:px-3.5 max-[640px]:py-3.5"
              >
                <OwnerPaymentSettingsClient initialSettings={paymentSettings} />
              </PanelCard>
            </div>
          </div>
        </section>
      ),
      standalone: true,
    },
  };

  return screens[activeSection];
}
