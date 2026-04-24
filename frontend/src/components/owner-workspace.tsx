import type { ReactNode } from "react";
import type { SessionPayload } from "@/lib/session";
import { BackofficeShell, PanelCard } from "@/components/backoffice-shell";
import { LogoutButton } from "@/components/logout-button";
import { InteractiveActionGrid } from "@/components/interactive-action-grid";
import {
  OwnerLogoClient,
  OwnerLogoProvider,
  OwnerLogoStatusPill,
  OwnerLogoStatusPreview,
  OwnerPasswordClient,
  OwnerPaymentSettingsClient,
  OwnerProfileClient,
  type OwnerPaymentSettingsValue,
} from "@/components/owner-settings-client";
import { PaymentCheckoutClient } from "@/components/payment-checkout-client";
import { ProductManagementStudio } from "@/components/product-management-studio";
import { ListStack, NoteStack, ThreeUpStats } from "@/components/owner-workspace/shared";
import { SalesPaginationMockup } from "@/components/sales-pagination-mockup";
import { PageHeader, StatusPill, inputClass } from "@/components/ui-primitives";

export type OwnerSectionKey = "sales" | "payments" | "receipts" | "reports" | "menu" | "overview" | "calculator" | "settings";

type OwnerWorkspaceProps = {
  session: SessionPayload;
  activeSection: OwnerSectionKey;
};

const storeNamePrompt = "กรอกชื่อร้าน";
const ownerNamePrompt = "กรอกชื่อของคุณ (เจ้าของ)";
const unsetStoreNames = new Set(["", "Main Store", "FastManFoods"]);
const unsetOwnerNames = new Set(["", "Store Owner"]);

const sectionMeta: Record<OwnerSectionKey, { label: string; href: string }> = {
  sales: { label: "ขาย / Sale", href: "/owner/sales" },
  payments: { label: "ชำระเงิน / Payment", href: "/owner/payments" },
  receipts: { label: "ใบเสร็จ / Receipt", href: "/owner/receipts" },
  reports: { label: "รายงาน / Report", href: "/owner/reports" },
  menu: { label: "สินค้า / Product", href: "/owner/menu" },
  overview: { label: "ภาพรวม / Overview", href: "/owner/overview" },
  calculator: { label: "คำนวณ / Calculator", href: "/owner/calculator" },
  settings: { label: "ตั้งค่า / Settings", href: "/owner/settings" },
};

const sectionIcons: Partial<Record<OwnerSectionKey, ReactNode>> = {
  sales: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path d="M14 9.846c-1-.923-3.667-1.23-3.667.616S14 11.385 14 13.23s-3 1.846-4 .615m2 .857V16m0-6.887V8M2 8l9.732-4.866a.6.6 0 0 1 .536 0L22 8" />
        <path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" />
      </g>
    </svg>
  ),
  payments: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="currentColor" fillRule="evenodd" clipRule="evenodd">
        <path d="M7.36 13.855a.33.33 0 0 0-.4-.24H4.885a4.4 4.4 0 0 0-1.537.26a.28.28 0 0 0-.232.225a.3.3 0 0 0 .003.114a.28.28 0 0 0 .329.24a6 6 0 0 1 1.198.239q.289.024.579 0q.297-.002.589-.06q.673-.136 1.307-.4a.34.34 0 0 0 .24-.379m8.513 2.626a4.6 4.6 0 0 0-1.657-.06c0-.22-.05-.44-.08-.66c-.05-.398-.12-.788-.18-1.187h1.218a.28.28 0 0 0 .32-.25a.29.29 0 0 0-.25-.329l-1.177-.09h-.2c0-.27-.08-.529-.11-.798a.3.3 0 0 0-.294-.354a.3.3 0 0 0-.295.354c0 .3 0 .599-.05.898a4.6 4.6 0 0 0-2.126.929a1.43 1.43 0 0 0-.36 1.696c.16.35.44.63.79.789a3.1 3.1 0 0 0 1.387.24h.429c0 .18 0 .359.07.529c.07.399.16.798.24 1.187h-.53a4.3 4.3 0 0 1-2.016-.778a.334.334 0 0 0-.42.519a5.3 5.3 0 0 0 2.347.998c.289.05.579.07.858.09l.15.619a.33.33 0 0 0 .379.28a.34.34 0 0 0 .28-.39v-.52q.475-.02.938-.139a3.1 3.1 0 0 0 1.567-.998a1.39 1.39 0 0 0 .17-1.527a1.94 1.94 0 0 0-1.398-1.048m-3.124.09a2.2 2.2 0 0 1-.769-.05a.66.66 0 0 1-.449-.3c-.19-.37 0-.649.35-.878a4.1 4.1 0 0 1 1.207-.57v1.767zm3.324 1.996a2.4 2.4 0 0 1-.889.549q-.36.12-.738.16c0-.42 0-.839-.08-1.258v-.52q.474-.036.948 0a1.1 1.1 0 0 1 .998.52c.02.21-.09.4-.24.569z" />
        <path d="M20.576 16.12a5.4 5.4 0 0 0-.71-1.487a16 16 0 0 0-1.207-1.507c.402-.15.737-.436.948-.809a1.94 1.94 0 0 0 .07-1.677q.233-.1.43-.26a1.996 1.996 0 0 0 .09-2.594a1.32 1.32 0 0 0 .678-1.328a2.44 2.44 0 0 0-1.457-1.437a3 3 0 0 0-.61-.22q-.307-.09-.628-.12q-.96-.013-1.917.07l-.658.06a1 1 0 0 0-.19-.09l-.928-.24c-.26 0-.52-.11-.789-.14a4 4 0 0 0-.609 0a4.3 4.3 0 0 0-1.627.68c-1.108.738-2.455 1.856-2.864 2.206c-.29.213-.639.335-.999.349H5.693a.28.28 0 0 0-.3.27a.29.29 0 0 0 .28.309c.774.103 1.556.136 2.336.1a2.4 2.4 0 0 0 1.068-.38c.409-.27 1.507-1.068 2.525-1.706c.468-.36 1-.627 1.567-.789q.2-.022.4 0c.239 0 .479.09.708.13l.719.21c.28.1.479.209.519.389s-.1.29-.33.449a2.6 2.6 0 0 1-.888.439q-.541.13-1.098.17a.49.49 0 0 0-.46.509q.015.12 0 .24a2.7 2.7 0 0 1-.588 1.906a3.25 3.25 0 0 1-2.096.998a.33.33 0 0 0-.29.37a.32.32 0 0 0 .3.289c-.42.549-.809 1.108-1.178 1.687q-.675 1.063-1.228 2.196a11 11 0 0 0-.649 1.747a6.6 6.6 0 0 0-.24 1.267a4.18 4.18 0 0 0 1.468 3.384a9 9 0 0 0 4.851 2.166a8.47 8.47 0 0 0 5.24-.998a5.36 5.36 0 0 0 2.556-4.672a5.7 5.7 0 0 0-.06-1.088a9 9 0 0 0-.25-1.048m-1.717-4.272a1 1 0 0 1-1.148.32a3.85 3.85 0 0 1-1.837-.66a.84.84 0 0 1-.42-.808a.84.84 0 0 1 .2-.38l.08-.059q.324.17.67.29a6.7 6.7 0 0 0 1.666.339q.503.027.998-.06a1.18 1.18 0 0 1-.21 1.018m.609-2.236a1.1 1.1 0 0 1-.44.14q-.444.045-.888 0a8 8 0 0 1-1.417-.26a4.6 4.6 0 0 1-.73-.22c.17-.149-.049-.688.1-.997q.086-.256.25-.47c.371.213.777.358 1.198.43a4.8 4.8 0 0 0 1.897 0l.14-.05c.132.186.214.402.239.629a1 1 0 0 1-.35.798M17.99 5.65l.998.369c.315.124.589.335.789.609c.09.13 0 .26-.23.409l-.339.18c-.492.16-1.01.224-1.527.19a3.1 3.1 0 0 1-.889-.2a.3.3 0 0 0-.299-.19l-.12-.08c.222-.282.322-.641.28-.998a1.7 1.7 0 0 0-.14-.37q.74.003 1.477.08m-.25 16.39a7.5 7.5 0 0 1-4.59.778a8.14 8.14 0 0 1-4.213-1.827a3.32 3.32 0 0 1-1.258-2.535a5.6 5.6 0 0 1 .23-1.377q.201-.704.509-1.368q.473-1.12 1.078-2.176a23 23 0 0 1 1.337-1.996a.3.3 0 0 0 0-.12a3.66 3.66 0 0 0 1.907-.998c.577-.62.904-1.43.918-2.276a5.7 5.7 0 0 0 1.108-.18q.42-.128.799-.35a2.6 2.6 0 0 0-.36.6c-.177.39-.25.82-.21 1.248q.02.176.11.329l-.09.06c-.168.16-.295.358-.369.579a1.63 1.63 0 0 0 .52 1.856a4.6 4.6 0 0 0 2.305.999q.2.015.4 0c.459.588.948 1.147 1.337 1.766c.25.402.439.84.559 1.298q.125.491.17.998q.037.469 0 .938a4.52 4.52 0 0 1-2.156 3.753zM11.652 3.114l.459.889a.29.29 0 0 0 .4.11a.3.3 0 0 0 .12-.4l-.34-.818l-.11-.58c0-.409 0-.598.19-.648c.247-.022.496.012.728.1c.375.114.767.161 1.158.14q.276-.057.52-.2c.199-.12.398-.29.608-.43s.14-.15.22-.13s.13.14.2.22q.142.215.309.41q.167.185.389.3c.52.133 1.072.057 1.537-.21c.17-.07.33-.15.49-.2h.11q.06.25.059.509l-.14.679l-.39.838a.34.34 0 0 0 .09.46a.318.318 0 0 0 .46-.13l.529-.919l.26-.858a1.49 1.49 0 0 0-.23-1.298a1.34 1.34 0 0 0-1.368-.09l-.638.17c-.11 0-.2.08-.28 0s-.16-.21-.25-.34a2 2 0 0 0-.399-.459a1.2 1.2 0 0 0-.469-.2a1.13 1.13 0 0 0-.699.06q-.395.181-.728.46q-.174.169-.4.26a3.4 3.4 0 0 1-.998-.08a2.1 2.1 0 0 0-.998.06c-.43.17-.818.558-.659 1.577z" />
      </g>
    </svg>
  ),
  receipts: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 21.919a1.45 1.45 0 0 1-.791-.232l-1.564-1.021a.47.47 0 0 0-.439-.028l-1.776.829a1.47 1.47 0 0 1-1.4-.087a1.21 1.21 0 0 1-.581-1.02V3.641a1.22 1.22 0 0 1 .584-1.021a1.47 1.47 0 0 1 1.4-.087l1.775.829a.47.47 0 0 0 .439-.026l1.563-1.023a1.46 1.46 0 0 1 1.581 0l1.564 1.022a.47.47 0 0 0 .44.026l1.775-.829a1.46 1.46 0 0 1 1.4.087a1.22 1.22 0 0 1 .581 1.021v16.72a1.22 1.22 0 0 1-.581 1.02a1.46 1.46 0 0 1-1.4.087l-1.77-.828a.47.47 0 0 0-.441.027l-1.564 1.021a1.45 1.45 0 0 1-.795.232M9.4 19.6a1.44 1.44 0 0 1 .79.234l1.564 1.02a.46.46 0 0 0 .487 0l1.565-1.021a1.46 1.46 0 0 1 1.41-.095l1.774.828a.46.46 0 0 0 .437-.024a.22.22 0 0 0 .118-.177V3.641a.22.22 0 0 0-.118-.177a.46.46 0 0 0-.437-.025l-1.775.829a1.46 1.46 0 0 1-1.409-.095l-1.563-1.022a.47.47 0 0 0-.486 0l-1.565 1.021a1.47 1.47 0 0 1-1.41.1l-1.775-.833a.46.46 0 0 0-.437.025a.22.22 0 0 0-.118.177V20.36a.22.22 0 0 0 .118.177a.47.47 0 0 0 .437.024l1.776-.829A1.5 1.5 0 0 1 9.4 19.6" />
      <path fill="currentColor" d="M15.046 7.4H8.954a.5.5 0 0 1 0-1h6.092a.5.5 0 0 1 0 1m0 3.553H8.954a.5.5 0 0 1 0-1h6.092a.5.5 0 0 1 0 1M12 14.5H8.954a.5.5 0 0 1 0-1H12a.5.5 0 0 1 0 1" />
    </svg>
  ),
  reports: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 512 512" aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" d="m384 85.333l85.334 85.333v256H42.667V85.333zM373.334 128h-288v256h341.333V181.333zm-224 42.666v132.258l61.057-76.321l65.215 32.597l47.925-43.129l14.272 15.857l-58.737 52.863l-62.81-31.394l-53.265 66.602h221.01v21.334H128V170.666z" />
    </svg>
  ),
  menu: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="4">
        <path d="M44 14L24 4L4 14v20l20 10l20-10z" />
        <path strokeLinecap="round" d="m4 14l20 10m0 20V24m20-10L24 24M34 9L14 19" />
      </g>
    </svg>
  ),
  overview: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="m19.675 20.337l.546-.546l-1.836-1.837V15.23h-.77v3.046zM5.615 20q-.67 0-1.143-.472Q4 19.056 4 18.385V5.615q0-.67.472-1.143Q4.944 4 5.616 4h12.769q.67 0 1.143.472q.472.472.472 1.144v5.95q-.263-.091-.504-.148q-.24-.056-.496-.112v-5.69q0-.231-.192-.424T18.384 5H5.616q-.231 0-.424.192T5 5.616v12.769q0 .23.192.423t.423.192h5.666q.036.28.093.521q.057.24.147.479zM5 18v1V5v6.306v-.075zm2.5-1.73h3.96q.055-.257.15-.497l.2-.504H7.5zm0-3.77h6.58q.493-.346.971-.586q.478-.241 1.026-.378V11.5H7.5zm0-3.77h9v-1h-9zM18 22.117q-1.671 0-2.835-1.165Q14 19.787 14 18.116t1.165-2.836T18 14.116t2.836 1.164T22 18.116q0 1.67-1.164 2.835Q19.67 22.116 18 22.116" />
    </svg>
  ),
  calculator: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
      <path fill="currentColor" d="M26 4v24H6V4zm0-2H6a2 2 0 0 0-2 2v24a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2" />
      <path fill="currentColor" d="M9 23h2v2H9zm12 0h2v2h-2zM9 18h2v2H9zm12 0h2v2h-2zM9 13h2v2H9zm6 10h2v2h-2zm0-5h2v2h-2zm0-5h2v2h-2zm6 0h2v2h-2zM9 7h14v3H9z" />
    </svg>
  ),
  settings: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5">
        <path d="M8.5 16.5a4.04 4.04 0 0 1 3.5-2.02a4.04 4.04 0 0 1 3.5 2.02M14 10a2 2 0 1 1-4 0a2 2 0 0 1 4 0Z" />
        <path strokeLinejoin="round" d="M22 13.967v-3.934c-2.857 0-4.714-3.103-3.268-5.566L15.268 2.5c-1.464 2.494-5.07 2.494-6.534 0L5.27 4.467C6.716 6.93 4.857 10.033 2 10.033v3.934c2.857 0 4.714 3.103 3.268 5.566L8.732 21.5c1.465-2.495 5.073-2.495 6.538 0l3.464-1.967c-1.447-2.463.41-5.566 3.266-5.566" />
      </g>
    </svg>
  ),
};

function formatRoleLabel(session: SessionPayload) {
  if (session.user.storeRole) {
    return `Store ${session.user.storeRole}`;
  }

  return "Owner";
}

function renderOwnerScreen(
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
      description: "จัดการข้อมูลร้าน เจ้าของร้าน และรหัสผ่านของบัญชีนี้",
      actions: <StatusPill tone="success">พร้อมตั้งค่าแล้ว</StatusPill>,
      body: (
        <section className="grid h-full min-h-0 grid-rows-[156px_minmax(0,1fr)] gap-[18px] max-[1180px]:grid-rows-[auto_minmax(0,1fr)]">
          <PageHeader
            eyebrow="Store Settings"
            title="ตั้งค่าร้าน"
            description="จัดการชื่อร้าน ชื่อเจ้าของร้าน และรหัสผ่านของบัญชีเจ้าของร้าน"
            actions={
              <StatusPill tone="success">พร้อมตั้งค่าแล้ว</StatusPill>
            }
          />

          <div className="grid min-h-0 grid-cols-[minmax(280px,1fr)_minmax(280px,1fr)_minmax(280px,1fr)] items-start gap-[18px] max-[1180px]:grid-cols-[repeat(2,minmax(280px,1fr))] max-[760px]:grid-cols-1">
            <PanelCard
              eyebrow="ความปลอดภัยของบัญชี"
              title="เปลี่ยนรหัสผ่าน"
              titleClassName="my-[10px] text-[clamp(1.65rem,2.1vw,2.35rem)] leading-[1.05] tracking-[-0.045em]"
              className="grid h-fit min-h-0 content-start px-5 py-5"
            >
              <OwnerPasswordClient />
            </PanelCard>

            <div className="grid gap-[18px]">
              <PanelCard
                eyebrow="โปรไฟล์ร้านค้า"
                title="ข้อมูลทั่วไป"
                titleClassName="my-[10px] text-[clamp(1.65rem,2.1vw,2.35rem)] leading-[1.05] tracking-[-0.045em]"
                className="grid h-fit min-h-0 content-start px-5 py-5"
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
                titleClassName="my-[10px] text-[clamp(1.65rem,2.1vw,2.35rem)] leading-[1.05] tracking-[-0.045em]"
                className="grid h-fit min-h-0 content-start px-5 py-5"
              >
                <OwnerLogoClient />
              </PanelCard>
            </div>

            <div className="grid h-fit min-w-0 gap-[18px]">
              <PanelCard
                eyebrow="การรับเงิน"
                title="QR / ข้อมูลโอน"
                titleClassName="my-[10px] text-[clamp(1.42rem,1.7vw,1.5rem)] leading-[1.08] tracking-[-0.035em]"
                className="grid h-fit min-h-0 min-w-0 content-start px-5 py-5"
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

export function OwnerWorkspace({ session, activeSection }: OwnerWorkspaceProps) {
  const rawStoreName = session.user.store?.name?.trim() || "";
  const rawOwnerName = session.user.displayName.trim();
  const formStoreName = unsetStoreNames.has(rawStoreName) ? "" : rawStoreName;
  const formOwnerName = unsetOwnerNames.has(rawOwnerName) ? "" : rawOwnerName;
  const storeName = formStoreName || storeNamePrompt;
  const ownerName = formOwnerName || ownerNamePrompt;
  const roleLabel = formatRoleLabel(session);
  const paymentSettings: OwnerPaymentSettingsValue = {
    promptPayEnabled: Boolean(session.user.store?.promptPayEnabled),
    promptPayRecipientType: session.user.store?.promptPayRecipientType || "MOBILE",
    promptPayId: session.user.store?.promptPayId || "",
    promptPayMobileId: session.user.store?.promptPayMobileId || "",
    promptPayNationalId: session.user.store?.promptPayNationalId || "",
    promptPayTaxId: session.user.store?.promptPayTaxId || "",
    bankName: session.user.store?.bankName || "",
    bankAccountName: session.user.store?.bankAccountName || "",
    bankAccountNumber: session.user.store?.bankAccountNumber || "",
    paymentQrImageUrl: session.user.store?.paymentQrImageUrl || "",
    paymentQrUploadedKey: session.user.store?.paymentQrUploadedKey || "",
  };
  const screen = renderOwnerScreen(activeSection, storeName, ownerName, formStoreName, formOwnerName, paymentSettings);
  const showFooterCards = !screen.standalone;
  const shell = (
    <BackofficeShell
      className="h-[calc(100vh-24px)] max-[1180px]:h-auto"
      brandName="Menu Store"
      brandSubtitle="โหมดใช้งานหลักสำหรับเจ้าของร้านที่ต้องการขาย จัดการสินค้า ดูรายงาน และควบคุมภาพหน้าร้านได้จากบัญชีเดียว"
      eyebrow="OWNER WORKSPACE"
      sidebarItems={(Object.keys(sectionMeta) as OwnerSectionKey[]).map((key) => ({
        label: sectionMeta[key].label,
        href: sectionMeta[key].href,
        active: key === activeSection,
        icon: sectionIcons[key],
      }))}
      profileName={storeName}
      profileSubtitle="เจ้าของร้าน"
      profileMeta={ownerName}
      profileRole={roleLabel}
      profileStatus="ออนไลน์"
      profileAction={<LogoutButton />}
      statusStoreContent={<OwnerLogoStatusPreview />}
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
  );

  return (
    <main className="h-screen overflow-hidden max-[1180px]:h-auto max-[1180px]:overflow-auto">
      <div className="mx-auto h-screen w-[min(1400px,calc(100%-32px))] px-0 py-3 max-[1180px]:h-auto max-[1180px]:py-3 max-[720px]:w-[min(100%-20px,100%)] max-[720px]:pt-2.5">
        <OwnerLogoProvider initialLogoUrl={session.user.store?.logoUrl}>{shell}</OwnerLogoProvider>
      </div>
    </main>
  );
}
