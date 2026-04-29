"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { OwnerPaymentSettingsValue } from "@/components/owner-settings-client/shared";
import { requestJson, requestProductList } from "@/components/product-management-studio/lib";
import type { ProductItem } from "@/components/product-management-studio/types";
import { formatBaht, normalizeStockValue, salesCartStorageKey } from "@/components/sales-pagination-mockup/helpers";
import type { Receipt, ReceiptListResponse } from "@/components/receipt-desk-client/receipt-format";
import { formatDateTime } from "@/components/receipt-desk-client/receipt-format";
import { Loader, secondaryButtonClass, StatusPill } from "@/components/ui-primitives";

type OwnerOverviewClientProps = {
  storeProfileComplete: boolean;
  hasStoreLogo: boolean;
  paymentSettings: OwnerPaymentSettingsValue;
};

type StoredCart = {
  items?: Array<{
    quantity?: number;
    product?: { name?: string; price?: number };
  }>;
};

function isReadyProduct(product: ProductItem) {
  return product.status === "พร้อมขาย" && (!product.trackStock || normalizeStockValue(product.stockQuantity) > 0);
}

function isClosedProduct(product: ProductItem) {
  return product.status !== "พร้อมขาย" || (product.trackStock && normalizeStockValue(product.stockQuantity) <= 0);
}

function isLowStockProduct(product: ProductItem) {
  return product.trackStock && product.lowStockThreshold > 0 && normalizeStockValue(product.stockQuantity) > 0 && normalizeStockValue(product.stockQuantity) <= product.lowStockThreshold;
}

function isIncompleteProduct(product: ProductItem) {
  return !product.name.trim() || !product.category || product.price <= 0 || !product.imageUrl;
}

function hasPromptPayValue(settings: OwnerPaymentSettingsValue) {
  return Boolean(
    settings.promptPayMobileId.trim() ||
      settings.promptPayNationalId.trim() ||
      settings.promptPayTaxId.trim() ||
      settings.paymentQrImageUrl.trim(),
  );
}

function hasBankTransfer(settings: OwnerPaymentSettingsValue) {
  return Boolean(settings.bankName.trim() && settings.bankAccountName.trim() && settings.bankAccountNumber.trim());
}

function readCartState() {
  if (typeof window === "undefined") {
    return { count: 0, total: 0 };
  }

  const raw = sessionStorage.getItem(salesCartStorageKey);
  if (!raw) {
    return { count: 0, total: 0 };
  }

  try {
    const parsed = JSON.parse(raw) as StoredCart;
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return items.reduce(
      (summary, item) => {
        const quantity = Math.max(0, Math.floor(item.quantity || 0));
        return {
          count: summary.count + quantity,
          total: summary.total + quantity * Math.max(0, item.product?.price || 0),
        };
      },
      { count: 0, total: 0 },
    );
  } catch {
    sessionStorage.removeItem(salesCartStorageKey);
    return { count: 0, total: 0 };
  }
}

async function loadAllProducts() {
  const pageSize = 50;
  const firstParams = new URLSearchParams({ page: "1", pageSize: String(pageSize) });
  const firstPage = await requestProductList(firstParams, { force: true });
  const allProducts = [...firstPage.products];

  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    const response = await requestProductList(params, { force: true });
    allProducts.push(...response.products);
  }

  return allProducts;
}

export function OwnerOverviewClient({
  storeProfileComplete,
  hasStoreLogo,
  paymentSettings,
}: OwnerOverviewClientProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [latestReceipt, setLatestReceipt] = useState<Receipt | null>(null);
  const [cartState, setCartState] = useState({ count: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        setLoading(true);
        setError("");
        const receiptParams = new URLSearchParams({ page: "1", pageSize: "1" });
        const [productResponse, receiptResponse] = await Promise.all([
          loadAllProducts(),
          requestJson<ReceiptListResponse>(`/api/sales?${receiptParams.toString()}`),
        ]);

        if (cancelled) return;
        setProducts(productResponse);
        setLatestReceipt(receiptResponse.receipts[0] || null);
        setCartState(readCartState());
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "โหลดภาพรวมร้านไม่สำเร็จ");
          setProducts([]);
          setLatestReceipt(null);
          setCartState(readCartState());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOverview();
    const handleStorage = () => setCartState(readCartState());
    window.addEventListener("storage", handleStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const qrReady = paymentSettings.promptPayEnabled && hasPromptPayValue(paymentSettings);
  const transferReady = hasBankTransfer(paymentSettings);
  const paymentReady = qrReady || transferReady;

  const productStatus = useMemo(() => {
    const ready = products.filter(isReadyProduct);
    const closed = products.filter(isClosedProduct);
    const lowStock = products.filter(isLowStockProduct);
    const incomplete = products.filter(isIncompleteProduct);
    const noImage = products.filter((product) => !product.imageUrl);

    return {
      total: products.length,
      ready: ready.length,
      closed: closed.length,
      lowStock: lowStock.length,
      incomplete: incomplete.length,
      noImage: noImage.length,
    };
  }, [products]);

  const tasks = [
    {
      label: "ยังไม่ได้ตั้งค่า QR พร้อมรับเงิน",
      done: qrReady,
      href: "/owner/settings",
    },
    {
      label: "ยังไม่มีโลโก้ร้าน",
      done: hasStoreLogo,
      href: "/owner/settings",
    },
    {
      label: "ยังไม่ได้กรอกชื่อร้าน/ชื่อเจ้าของจริง",
      done: storeProfileComplete,
      href: "/owner/settings",
    },
    {
      label: `มีสินค้าไม่มีรูป ${productStatus.noImage} รายการ`,
      done: productStatus.noImage === 0,
      href: "/owner/menu",
    },
    {
      label: `มีสินค้าปิดขาย ${productStatus.closed} รายการ`,
      done: productStatus.closed === 0,
      href: "/owner/menu",
    },
    {
      label: `มีสินค้าที่ stock ต่ำ ${productStatus.lowStock} รายการ`,
      done: productStatus.lowStock === 0,
      href: "/owner/menu",
    },
  ];
  const openTasks = tasks.filter((task) => !task.done);

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_320px] items-start gap-[18px] max-[1366px]:grid-cols-1 max-[820px]:gap-4">
      <section className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] content-start gap-[18px]" aria-label="store overview main area">
        <div className="grid grid-cols-4 gap-[10px] rounded-none border border-[var(--border)] bg-[var(--surface)] px-[22px] py-5 shadow-[var(--shadow-soft)] max-[1180px]:grid-cols-2 max-[640px]:grid-cols-1">
          {[
            ["ร้านวันนี้", "ออนไลน์ / พร้อมขาย"],
            ["QR พร้อมรับเงิน", qrReady ? "พร้อม" : "ยังไม่พร้อม"],
            ["สินค้าเปิดขาย", `${productStatus.ready} รายการ`],
            ["งานที่ควรทำ", `${openTasks.length} รายการ`],
          ].map(([label, value]) => (
            <div key={label} className="grid h-[72px] content-center rounded-none border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
              <span className="truncate text-[0.78rem] text-[var(--foreground-soft)]">{label}</span>
              <strong className="mt-1 block truncate text-[1rem] text-[var(--foreground)]">{value}</strong>
            </div>
          ))}
        </div>

        {error ? (
          <div className="rounded-none border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-[var(--danger-bright)]">{error}</div>
        ) : null}

        <div className="grid min-h-0 grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)] items-start gap-[18px] max-[1180px]:grid-cols-1">
          <section className="grid min-h-0 content-start gap-[18px] rounded-none border border-[var(--border)] bg-[var(--panel-strong)] px-5 py-[18px] shadow-[var(--shadow-soft)] max-[820px]:px-4 max-[820px]:py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Store Readiness</p>
                <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-[var(--foreground)]">เช็กลิสต์พร้อมขาย</strong>
              </div>
              <StatusPill tone={openTasks.length === 0 ? "success" : "ghost"}>{openTasks.length === 0 ? "พร้อม" : `${openTasks.length} งาน`}</StatusPill>
            </div>

            {loading ? (
              <div className="grid min-h-[220px] place-items-center rounded-none border border-dashed border-[var(--border)]">
                <Loader size={54} label="กำลังโหลดภาพรวมร้าน" />
              </div>
            ) : (
              <div className="grid gap-3">
                {tasks.map((task) => (
                  <Link
                    key={task.label}
                    href={task.href}
                    className={
                      task.done
                        ? "grid min-h-[58px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-none border border-[var(--success-border)] bg-[var(--success-wash)] px-4 py-3 text-[var(--foreground)]"
                        : "grid min-h-[58px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-none border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-hover)]"
                    }
                  >
                    <span className={task.done ? "grid h-7 w-7 place-items-center rounded-full border border-[var(--success-border)] text-[var(--success)]" : "grid h-7 w-7 place-items-center rounded-full border border-[var(--border)] text-[var(--foreground-soft)]"}>
                      {task.done ? "✓" : "!"}
                    </span>
                    <strong className="truncate text-[0.95rem]">{task.label}</strong>
                    <span className="text-[0.8rem] font-bold text-[var(--foreground-soft)]">{task.done ? "เรียบร้อย" : "แก้ไข"}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="grid content-start gap-[18px] rounded-none border border-[var(--border)] bg-[var(--panel-strong)] px-5 py-[18px] shadow-[var(--shadow-soft)] max-[820px]:px-4 max-[820px]:py-4">
            <div>
              <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Product Operations</p>
              <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-[var(--foreground)]">สถานะสินค้า</strong>
            </div>
            <div className="grid grid-cols-2 gap-[10px]">
              {[
                ["พร้อมขาย", productStatus.ready],
                ["ปิดขาย", productStatus.closed],
                ["Stock ต่ำ", productStatus.lowStock],
                ["ข้อมูลไม่ครบ", productStatus.incomplete],
              ].map(([label, value]) => (
                <div key={label} className="rounded-none border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3">
                  <span className="text-[0.76rem] text-[var(--foreground-soft)]">{label}</span>
                  <strong className="mt-1 block text-[1.15rem] text-[var(--foreground)]">{value}</strong>
                </div>
              ))}
            </div>
            <Link href="/owner/menu" className={`${secondaryButtonClass} min-h-[48px] rounded-2xl`}>
              จัดการสินค้า
            </Link>
          </section>
        </div>
      </section>

      <aside className="grid h-fit min-h-0 content-start gap-[18px] rounded-none border border-[var(--border)] bg-[var(--panel-strong)] p-[18px] shadow-[var(--shadow-soft)] max-[720px]:p-4">
        <div>
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Action Queue</p>
          <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-[var(--foreground)]">บิล / งานค้าง</strong>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-2 rounded-none border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <span className="text-[0.78rem] text-[var(--foreground-soft)]">บิลล่าสุด</span>
            {latestReceipt ? (
              <>
                <strong className="text-[1rem] text-[var(--foreground)]">{latestReceipt.code}</strong>
                <span className="text-[0.84rem] text-[var(--foreground-soft)]">{formatDateTime(latestReceipt.createdAt)} / {formatBaht(latestReceipt.total)}</span>
                <Link href="/owner/receipts" className={`${secondaryButtonClass} mt-1 min-h-[40px] rounded-xl text-[0.9rem]`}>
                  เปิดใบเสร็จ
                </Link>
              </>
            ) : (
              <span className="text-[0.9rem] text-[var(--foreground-soft)]">ยังไม่มีบิลล่าสุด</span>
            )}
          </div>

          <div className="grid gap-2 rounded-none border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <span className="text-[0.78rem] text-[var(--foreground-soft)]">ตะกร้าค้าง</span>
            <strong className="text-[1rem] text-[var(--foreground)]">{cartState.count > 0 ? `${cartState.count} ชิ้น / ${formatBaht(cartState.total)}` : "ไม่มีตะกร้าค้าง"}</strong>
            <Link href={cartState.count > 0 ? "/owner/payments" : "/owner/sales"} className={`${secondaryButtonClass} mt-1 min-h-[40px] rounded-xl text-[0.9rem]`}>
              {cartState.count > 0 ? "ไปชำระเงิน" : "เริ่มขาย"}
            </Link>
          </div>

          <div className="grid gap-2 rounded-none border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <span className="text-[0.78rem] text-[var(--foreground-soft)]">การรับชำระเงิน</span>
            <strong className="text-[1rem] text-[var(--foreground)]">{paymentReady ? "พร้อมรับชำระ" : "ยังตั้งค่าไม่ครบ"}</strong>
            <span className="text-[0.84rem] text-[var(--foreground-soft)]">QR: {qrReady ? "พร้อม" : "ยังไม่พร้อม"} / โอนเงิน: {transferReady ? "พร้อม" : "ยังไม่พร้อม"}</span>
            <Link href="/owner/settings" className={`${secondaryButtonClass} mt-1 min-h-[40px] rounded-xl text-[0.9rem]`}>
              ตั้งค่าการรับเงิน
            </Link>
          </div>
        </div>

      </aside>
    </div>
  );
}
