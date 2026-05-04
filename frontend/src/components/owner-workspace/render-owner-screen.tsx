import type { ReactNode } from "react";
import Link from "next/link";
import { PanelCard } from "@/components/backoffice-shell";
import type { OwnerPaymentSettingsValue } from "@/components/owner-settings-client/shared";
import { ipadAirLandscapeClass, ipadAirOnlyFlexClass, ipadAirOnlyGridRowsSingleClass, ipadAirOnlyHideClass } from "@/components/owner-workspace/ipad-air-classes";
import { ProfileHeaderInjector } from "@/components/owner-workspace/profile-header-injector";
import { ListStack, NoteStack, ThreeUpStats } from "@/components/owner-workspace/shared";
import { PageHeader, StatusPill } from "@/components/ui-primitives";
import type { OwnerSectionKey } from "@/components/owner-workspace";

const storeNamePrompt = "กรอกชื่อร้าน";
const ownerNamePrompt = "กรอกชื่อของคุณ";

const ownerPageWithHeaderClass = `grid h-full min-h-0 grid-rows-[156px_minmax(0,1fr)] gap-[18px] ${ipadAirOnlyGridRowsSingleClass} max-[820px]:h-auto max-[820px]:grid-rows-[auto_auto] [@media(max-height:860px)_and_(max-width:820px)]:h-auto [@media(max-height:860px)_and_(max-width:820px)]:grid-rows-[auto_auto]`;
const ownerPageWithHeaderGapClass = `${ownerPageWithHeaderClass} max-[820px]:gap-4`;

function hasPromptPayValue(settings: OwnerPaymentSettingsValue) {
  return Boolean(
    settings.promptPayMobileId.trim() ||
      settings.promptPayNationalId.trim() ||
      settings.promptPayTaxId.trim() ||
      settings.paymentQrImageUrl.trim(),
  );
}

function hasBankTransferValue(settings: OwnerPaymentSettingsValue) {
  return Boolean(settings.bankName.trim() && settings.bankAccountName.trim() && settings.bankAccountNumber.trim());
}

type OwnerScreen = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  body: ReactNode;
  standalone?: boolean;
};

export async function renderOwnerScreen(
  activeSection: OwnerSectionKey,
  storeName: string,
  ownerName: string,
  formStoreName: string,
  formOwnerName: string,
  paymentSettings: OwnerPaymentSettingsValue,
  storeLogoUrl = "",
  ownerTheme = "light",
) {
  if (activeSection === "sales") {
    const { SalesWorkspaceClient } = await import("@/components/sales-workspace-client");
    return {
      eyebrow: "Sales Floor",
      title: "ขายหน้าร้าน",
      description: "โครงหน้าขายแบบอิง reference เดิม แต่ย้ายไปใช้ Tailwind utility ใน JSX เพื่อให้ปรับหน้านี้ได้ตรงจุด",
      actions: <StatusPill tone="success">Layout Locked</StatusPill>,
      body: (
        <section className={ownerPageWithHeaderClass} aria-label="sales layout">
          <PageHeader
            eyebrow="Sales Floor"
            title="ขายหน้าร้าน"
            description="จัดการรายการขายหน้าร้านของคุณ เลือกสินค้า เพิ่มลงตะกร้า และติดตามบิลที่กำลังขาย พร้อมเข้าสู่ขั้นตอนชำระเงินได้อย่างรวดเร็ว"
            actions={<StatusPill tone="success">พร้อมขายแล้ว</StatusPill>}
            className="h-[144px] min-h-[144px] max-h-[144px] px-4 py-4 max-[820px]:h-auto max-[820px]:min-h-0 max-[820px]:max-h-none max-[640px]:px-3.5 max-[640px]:py-3.5 [@media(max-height:860px)_and_(max-width:820px)]:h-auto [@media(max-height:860px)_and_(max-width:820px)]:min-h-0 [@media(max-height:860px)_and_(max-width:820px)]:max-h-none"
          />

          <SalesWorkspaceClient />
        </section>
      ),
      standalone: true,
    } satisfies OwnerScreen;
  }

  if (activeSection === "payments") {
    const { PaymentCheckoutClient } = await import("@/components/payment-checkout-client");
    return {
      eyebrow: "Checkout",
      title: "ชำระเงิน",
      description: "รับตะกร้าจากหน้าขาย เลือกวิธีรับเงิน ใส่ส่วนลดหรือภาษี แล้วบันทึกบิลจริง",
      actions: <StatusPill tone="success">พร้อมรับชำระ</StatusPill>,
      body: (
        <section className={ownerPageWithHeaderClass} aria-label="payment layout">
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
    } satisfies OwnerScreen;
  }

  if (activeSection === "receipts") {
    const { ReceiptDeskClient } = await import("@/components/receipt-desk-client");
    return {
      eyebrow: "Receipt Desk",
      title: "ใบเสร็จ",
      description: "รวมการค้นบิล ซ้ำพิมพ์ และส่งสลิปแบบย่อในจอเดียว",
      actions: <StatusPill tone="success">เชื่อมบิลขายจริง</StatusPill>,
      body: (
        <section
          className={`${ownerPageWithHeaderGapClass} ${ipadAirLandscapeClass}:!flex ${ipadAirLandscapeClass}:!h-[calc(100dvh-48px)] ${ipadAirLandscapeClass}:!min-h-[calc(100dvh-48px)] ${ipadAirLandscapeClass}:!flex-col ${ipadAirLandscapeClass}:overflow-hidden ${ipadAirLandscapeClass}:gap-[18px]`}
        >
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
    } satisfies OwnerScreen;
  }

  if (activeSection === "reports") {
    const { ReportsSalesChart } = await import("@/components/reports-sales-chart");
    return {
      eyebrow: "Reports",
      title: "รายงาน",
      description: "มุมมองยอดขายจริงแบบอ่านเร็ว พร้อมกราฟแนวโน้มตามช่วงเวลาที่เลือก",
      actions: <StatusPill tone="success">ข้อมูลยอดขายจริง</StatusPill>,
        body: (
          <section
            className={`${ownerPageWithHeaderGapClass} ${ipadAirLandscapeClass}:!flex ${ipadAirLandscapeClass}:!h-[calc(100dvh-48px)] ${ipadAirLandscapeClass}:!min-h-[calc(100dvh-48px)] ${ipadAirLandscapeClass}:!w-full ${ipadAirLandscapeClass}:!flex-col ${ipadAirLandscapeClass}:overflow-hidden ${ipadAirLandscapeClass}:gap-[18px]`}
          >
          <PageHeader
            eyebrow="Reports"
            title="รายงาน"
            description="ติดตามยอดขายรายชั่วโมง รายวัน และสรุปสินค้าขายดีจากบิลจริง"
            actions={
              <StatusPill tone="success">ข้อมูลยอดขายจริง</StatusPill>
            }
          />

            <div
              className={`min-h-0 ${ipadAirLandscapeClass}:h-full ${ipadAirLandscapeClass}:min-h-0 ${ipadAirLandscapeClass}:w-full ${ipadAirLandscapeClass}:justify-self-stretch ${ipadAirLandscapeClass}:flex-1 ${ipadAirLandscapeClass}:overflow-hidden`}
            >
              <ReportsSalesChart />
            </div>
        </section>
      ),
      standalone: true,
    } satisfies OwnerScreen;
  }

  if (activeSection === "menu") {
    const { ProductManagementStudio } = await import("@/components/product-management-studio");
    return {
      eyebrow: "Product Studio",
      title: "สินค้า",
      description: "จัดการสินค้าแบบหน้าจอเดียวตามมุมมองร้าน ใช้รายการด้านขวาและฟอร์มแก้ไขด้านซ้ายตามภาพอ้างอิง",
      body: <ProductManagementStudio />,
      standalone: true,
    } satisfies OwnerScreen;
  }

  if (activeSection === "overview") {
    const { OwnerOverviewClient } = await import("@/components/owner-overview-client");

    return {
      eyebrow: "Overview",
      title: "ภาพรวมร้าน",
      description: "หน้ารวมสำหรับ owner โดยไม่ปะปนเรื่อง platform-level control ของ superadmin",
      actions: <StatusPill>{storeName}</StatusPill>,
      body: (
        <section className={ownerPageWithHeaderGapClass}>
          <PageHeader
            eyebrow="Overview"
            description="ตรวจความพร้อมของร้าน สินค้า การรับเงิน และงานค้างที่ควรจัดการก่อนเริ่มขาย"
            title="ภาพรวมร้าน"
            actions={
              <>
                <StatusPill tone="success">พร้อมเช็ก</StatusPill>
              </>
            }
          />

          <OwnerOverviewClient
            storeProfileComplete={Boolean(formStoreName.trim() && formOwnerName.trim())}
            hasStoreLogo={Boolean(storeLogoUrl)}
            paymentSettings={paymentSettings}
          />

          <div className="hidden">
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
    } satisfies OwnerScreen;
  }

  if (activeSection === "calculator") {
    const { ProfitCalculatorClient } = await import("@/components/profit-calculator-client");
    return {
      eyebrow: "Cost Calculator",
      title: "คำนวณ",
      description: "ดึงยอดขายจริง แล้วให้เจ้าของร้านกรอกต้นทุนเองเพื่อประเมินกำไร",
      actions: <StatusPill tone="success">พร้อมคำนวณ</StatusPill>,
      body: (
        <section className={ownerPageWithHeaderGapClass}>
          <PageHeader
            eyebrow="Cost Calculator"
            title="คำนวณ"
            description="เลือกช่วงยอดขายจริง แล้วกรอกต้นทุนเพื่อดูภาพกำไรของร้าน"
            actions={
              <StatusPill tone="success">พร้อมคำนวณ</StatusPill>
            }
          />

          <ProfitCalculatorClient />
        </section>
      ),
      standalone: true,
    } satisfies OwnerScreen;
  }

  const {
    OwnerLogoClient,
    OwnerLogoStatusPill,
    OwnerPasswordClient,
    OwnerPaymentSettingsClient,
    OwnerProfileClient,
    OwnerThemeClient,
    OwnerThemeStatusPill,
  } = await import("@/components/owner-settings-client");

  return {
    eyebrow: "Store Settings",
    title: "ตั้งค่าร้าน",
    description: "จัดการข้อมูลร้าน เจ้าของร้าน และรหัสผ่านของบัญชีนี้",
    actions: <StatusPill tone="success">พร้อมตั้งค่าแล้ว</StatusPill>,
    body: (
      <section className={`${ownerPageWithHeaderClass} ${ipadAirLandscapeClass}:h-full`}>
        <PageHeader
          eyebrow="Store Settings"
          title="ตั้งค่าร้าน"
          description="จัดการชื่อร้าน ชื่อเจ้าของร้าน และรหัสผ่านของบัญชีเจ้าของร้าน"
          actions={<StatusPill tone="success">พร้อมตั้งค่าแล้ว</StatusPill>}
          className={ipadAirOnlyHideClass}
        />

        <div className="grid min-h-0 grid-cols-[minmax(250px,1fr)_minmax(250px,1fr)_minmax(250px,1fr)] items-start gap-[12px] max-[980px]:grid-cols-1 max-[820px]:gap-4">
          <div className="grid gap-[12px] max-[820px]:gap-4">
          <PanelCard
            eyebrow="ความปลอดภัยของบัญชี"
            title="เปลี่ยนรหัสผ่าน"
            titleClassName="my-[7px] text-[clamp(1.42rem,1.82vw,1.94rem)] leading-[1.05] tracking-[-0.04em]"
            className="grid h-fit min-h-0 content-start px-3.5 py-3.5 max-[820px]:px-3.5 max-[820px]:py-3.5 max-[640px]:px-3 max-[640px]:py-3"
          >
            <OwnerPasswordClient />
          </PanelCard>

          <ProfileHeaderInjector className={`hidden ${ipadAirOnlyFlexClass}`} />

          <PanelCard
            eyebrow="ธีม"
            title="เปลี่ยนธีม"
            actions={<OwnerThemeStatusPill />}
            titleClassName="my-[6px] text-[1.42rem] leading-[1.06] tracking-[-0.035em]"
            className="hidden [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:grid [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid h-fit min-h-0 min-w-0 content-start overflow-hidden px-4 py-4 max-[820px]:px-4 max-[820px]:py-4 max-[640px]:px-3.5 max-[640px]:py-3.5"
          >
            <OwnerThemeClient className="mt-0" serverTheme={ownerTheme} />
          </PanelCard>

          </div>

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
              className={`grid h-fit min-h-0 min-w-0 content-start overflow-hidden px-4 py-4 max-[820px]:px-4 max-[820px]:py-4 max-[640px]:px-3.5 max-[640px]:py-3.5 ${ipadAirOnlyHideClass}`}
            >
              <OwnerThemeClient serverTheme={ownerTheme} />
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

          {false ? <aside className={`hidden min-h-0 ${ipadAirLandscapeClass}:grid`}>
            <PanelCard
              eyebrow="Quick Panel"
              title="สถานะตั้งค่า"
              titleClassName="my-[10px] text-[1.2rem] leading-tight tracking-[-0.04em]"
              className="grid h-full min-h-0 content-start px-3.5 py-3.5"
            >
              <div className="grid gap-3">
                <div className="rounded-none border border-[var(--border-subtle)] bg-[var(--panel-subtle)] px-3.5 py-3">
                  <span className="text-[0.82rem] text-[var(--foreground-soft)]">ข้อมูลร้าน</span>
                  <strong className="mt-1 block text-[1.05rem] leading-[1.1] text-[var(--foreground)]">
                    {(formStoreName.trim() ? 1 : 0) + (formOwnerName.trim() ? 1 : 0)} / 2 ส่วน
                  </strong>
                </div>
                <div className="rounded-none border border-[var(--border-subtle)] bg-[var(--panel-subtle)] px-3.5 py-3">
                  <span className="text-[0.82rem] text-[var(--foreground-soft)]">ช่องทางรับเงิน</span>
                  <strong className="mt-1 block text-[1.05rem] leading-[1.1] text-[var(--foreground)]">
                    {Number(hasPromptPayValue(paymentSettings)) + Number(hasBankTransferValue(paymentSettings))} / 2 วิธี
                  </strong>
                </div>
                <div className="border-t border-t-[var(--border-subtle)] pt-3">
                  <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Customer Display</p>
                  <strong className="mt-2 block text-[1.18rem] leading-tight tracking-[-0.04em] text-[var(--foreground)]">จอลูกค้า</strong>
                  <Link
                    href="/owner/payments"
                    className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-[var(--accent-border)] bg-[var(--surface)] px-4 py-2.5 text-[0.98rem] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:shadow-[var(--shadow-soft)]"
                  >
                    เปิดจอ
                  </Link>
                </div>
              </div>
            </PanelCard>
          </aside> : null}
        </div>

        <div className="hidden min-h-0 content-start items-start gap-[12px]">
          <PanelCard
            eyebrow="ความปลอดภัยของบัญชี"
            title="เปลี่ยนรหัสผ่าน"
            titleClassName="my-[7px] text-[clamp(1.42rem,1.82vw,1.94rem)] leading-[1.05] tracking-[-0.04em]"
            className="grid h-fit min-h-0 content-start px-3.5 py-3.5"
          >
            <OwnerPasswordClient />
          </PanelCard>

          <PanelCard
            eyebrow="โปรไฟล์ร้านค้า"
            title="ข้อมูลทั่วไป"
            titleClassName="my-[7px] text-[clamp(1.28rem,1.55vw,1.66rem)] leading-[1.05] tracking-[-0.035em]"
            className="grid h-fit min-h-0 min-w-0 content-start overflow-hidden px-3.5 py-3.5"
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
            eyebrow="การรับเงิน"
            title="QR / ข้อมูลโอน"
            titleClassName="my-[8px] text-[clamp(1.26rem,1.46vw,1.38rem)] leading-[1.08] tracking-[-0.03em]"
            className="grid h-fit min-h-0 min-w-0 content-start px-4 py-4"
          >
            <OwnerPaymentSettingsClient initialSettings={paymentSettings} />
          </PanelCard>

          <PanelCard
            eyebrow="สัญลักษณ์"
            title="โลโก้ร้าน"
            actions={<OwnerLogoStatusPill />}
            titleClassName="my-[7px] text-[clamp(1.42rem,1.76vw,1.8rem)] leading-[1.05] tracking-[-0.04em]"
            className="grid h-fit min-h-0 min-w-0 content-start px-3.5 py-3.5"
          >
            <OwnerLogoClient />
          </PanelCard>

          <PanelCard
            eyebrow="ธีม"
            title="เปลี่ยนธีม"
            actions={<OwnerThemeStatusPill />}
            titleClassName="my-[8px] text-[clamp(1.5rem,1.9vw,1.8rem)] leading-[1.05] tracking-[-0.04em]"
            className="grid h-fit min-h-0 min-w-0 content-start overflow-hidden px-4 py-4"
          >
            <OwnerThemeClient />
          </PanelCard>
        </div>
      </section>
    ),
    standalone: true,
  } satisfies OwnerScreen;
}
