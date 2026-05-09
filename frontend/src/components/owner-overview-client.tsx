"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { OwnerPaymentSettingsValue } from "@/components/owner-settings-client/shared";
import {
  ownerLandscapeClass,
  ownerLandscapeCompactPanelPaddingClass,
  ownerLandscapePanelPaddingClass,
  ownerLandscapeTightGapClass,
} from "@/components/owner-workspace/landscape-preset";
import { requestJson, requestProductList } from "@/components/product-management-studio/lib";
import type { ProductItem } from "@/components/product-management-studio/types";
import { formatBaht, normalizeStockValue, salesCartStorageKey } from "@/components/sales-workspace/helpers";
import type { Receipt, ReceiptListResponse } from "@/components/receipt-desk-client/receipt-format";
import { formatDateTime } from "@/components/receipt-desk-client/receipt-format";
import { secondaryButtonClass, StatusPill } from "@/components/ui-primitives";

const ipadAirLandscapeClass = ownerLandscapeClass;

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
      href: "/owner/profile",
    },
    {
      label: "ยังไม่ได้กรอกชื่อร้าน/ชื่อเจ้าของจริง",
      done: storeProfileComplete,
      href: "/owner/profile",
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
    <div className={`grid h-full min-h-0 min-w-0 w-full max-w-full grid-cols-[minmax(0,1fr)_320px] items-start gap-[18px] [@media(orientation:portrait)]:h-auto [@media(orientation:portrait)]:grid-cols-1 [@media(orientation:portrait)]:gap-4 ${ownerLandscapeClass}:grid-cols-[minmax(0,1fr)_244px] ${ownerLandscapeClass}:gap-[12px] max-[820px]:grid-cols-1 max-[820px]:gap-4 ${ipadAirLandscapeClass}:items-stretch`}>
      <section className={`grid min-h-0 min-w-0 w-full grid-rows-[auto_auto_minmax(0,1fr)] content-start gap-[18px] ${ownerLandscapeTightGapClass} ${ipadAirLandscapeClass}:h-full ${ipadAirLandscapeClass}:grid-rows-[auto_minmax(0,1fr)]`} aria-label="store overview main area">
        <div className={`grid min-w-0 grid-cols-4 gap-[10px] rounded-none border border-[var(--border)] bg-[var(--surface)] px-[22px] py-5 shadow-[var(--shadow-soft)] [@media(orientation:portrait)]:grid-cols-2 [@media(orientation:portrait)_and_(max-width:640px)]:grid-cols-1 ${ownerLandscapePanelPaddingClass} ${ownerLandscapeClass}:grid-cols-4 max-[1180px]:grid-cols-2 max-[640px]:grid-cols-1 ${ipadAirLandscapeClass}:py-4`}>
          {[
            ["ร้านวันนี้", "ออนไลน์ / พร้อมขาย"],
            ["QR พร้อมรับเงิน", qrReady ? "พร้อม" : "ยังไม่พร้อม"],
            ["สินค้าเปิดขาย", `${productStatus.ready} รายการ`],
            ["งานที่ควรทำ", `${openTasks.length} รายการ`],
          ].map(([label, value]) => (
            <div key={label} className={`grid min-w-0 h-[72px] content-center rounded-none border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 ${ownerLandscapeClass}:h-[66px] ${ownerLandscapeClass}:px-2.5`}>
              <span className="truncate text-[0.78rem] text-[var(--foreground-soft)]">{label}</span>
              <strong className="mt-1 block truncate text-[1rem] text-[var(--foreground)]">{value}</strong>
            </div>
          ))}
        </div>

        {error ? (
          <div className="rounded-none border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-[var(--danger-bright)]">{error}</div>
        ) : null}

        <div className={`grid min-h-0 w-full grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)] items-start gap-[18px] [@media(orientation:portrait)]:grid-cols-1 [@media(orientation:portrait)]:gap-4 ${ownerLandscapeClass}:gap-[14px] max-[820px]:grid-cols-1 ${ipadAirLandscapeClass}:!grid-cols-1 ${ipadAirLandscapeClass}:items-stretch [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!grid-cols-[minmax(0,1fr)] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!grid-cols-1`}>
          <section className={`grid min-h-0 w-full max-w-none justify-self-stretch content-start gap-[18px] rounded-none border border-[var(--border)] bg-[var(--panel-strong)] px-5 py-[18px] shadow-[var(--shadow-soft)] ${ownerLandscapePanelPaddingClass} ${ownerLandscapeClass}:gap-[14px] max-[820px]:px-4 max-[820px]:py-4 ${ipadAirLandscapeClass}:h-full ${ipadAirLandscapeClass}:!w-full ${ipadAirLandscapeClass}:content-stretch [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!col-span-full [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!w-full [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!max-w-none [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!col-span-full [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!w-full [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!max-w-none`} aria-label="store readiness">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Store Readiness</p>
                <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-[var(--foreground)]">เช็กลิสต์พร้อมขาย</strong>
              </div>
              <StatusPill tone={openTasks.length === 0 ? "success" : "ghost"}>{openTasks.length === 0 ? "พร้อม" : `${openTasks.length} งาน`}</StatusPill>
            </div>

            {loading ? (
              <div className={`grid gap-3 ${ipadAirLandscapeClass}:gap-2`} aria-busy="true" aria-label="Loading store readiness">
                {Array.from({ length: tasks.length }).map((_, index) => (
                  <div
                    key={index}
                    className={`grid min-h-[58px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-none border border-[var(--border)] bg-[var(--surface)] px-4 py-3 ${ipadAirLandscapeClass}:min-h-[56px]`}
                  >
                    <span className="h-7 w-7 rounded-full border border-[var(--border)] bg-[var(--surface-muted)]" />
                    <span className="h-3 w-full max-w-[160px] rounded-full bg-[var(--surface-muted)]" />
                    <span className="h-3 w-14 rounded-full bg-[var(--surface-muted)]" />
                  </div>
                ))}
              </div>
            ) : (
              <div className={`grid gap-3 ${ipadAirLandscapeClass}:gap-2`}>
                {tasks.map((task) => (
                  <Link
                    key={task.label}
                    href={task.href}
                    className={
                      task.done
                        ? `grid min-h-[58px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-none border border-[var(--success-border)] bg-[var(--success-wash)] px-4 py-3 text-[var(--foreground)] ${ipadAirLandscapeClass}:min-h-[56px]`
                        : `grid min-h-[58px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-none border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-hover)] ${ipadAirLandscapeClass}:min-h-[56px]`
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

          <section className={`grid content-start gap-[18px] rounded-none border border-[var(--border)] bg-[var(--panel-strong)] px-5 py-[18px] shadow-[var(--shadow-soft)] ${ownerLandscapePanelPaddingClass} ${ownerLandscapeClass}:gap-[14px] max-[820px]:px-4 max-[820px]:py-4 ${ipadAirLandscapeClass}:hidden [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!hidden [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!hidden`}>
            <div>
              <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Product Operations</p>
              <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-[var(--foreground)]">สถานะสินค้า</strong>
            </div>
            <div className="grid grid-cols-2 gap-[10px] [@media(orientation:portrait)_and_(max-width:640px)]:grid-cols-1">
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

      <aside className={`grid h-fit min-h-0 min-w-0 content-start gap-[18px] overflow-hidden rounded-none border border-[var(--border)] bg-[var(--panel-strong)] p-[18px] shadow-[var(--shadow-soft)] ${ownerLandscapeCompactPanelPaddingClass} ${ownerLandscapeClass}:h-full ${ownerLandscapeClass}:grid-rows-[auto_minmax(0,1fr)_auto] ${ownerLandscapeClass}:content-stretch ${ownerLandscapeClass}:gap-[12px] ${ownerLandscapeClass}:p-3 max-[720px]:p-4 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!h-full [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!grid-rows-[auto_minmax(0,1fr)_auto] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!content-stretch [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!gap-[12px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!p-3`}>
        <div>
          <p className={`m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)] ${ownerLandscapeClass}:text-[0.64rem] ${ownerLandscapeClass}:tracking-[0.2em] ${ownerLandscapeClass}:leading-none [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!text-[0.64rem] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!tracking-[0.2em] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!leading-none`}>Action Queue</p>
          <strong className={`my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-[var(--foreground)] ${ownerLandscapeClass}:my-[6px] ${ownerLandscapeClass}:text-[1.12rem] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!my-[6px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!text-[1.12rem]`}>บิล / งานค้าง</strong>
        </div>

        <div className={`grid min-h-0 min-w-0 content-start gap-3 ${ownerLandscapeClass}:h-full ${ownerLandscapeClass}:grid-rows-[minmax(0,1fr)_minmax(0,0.88fr)_minmax(0,1fr)] ${ownerLandscapeClass}:content-stretch ${ownerLandscapeClass}:gap-[12px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!h-full [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!grid-rows-[minmax(0,1fr)_minmax(0,0.88fr)_minmax(0,1fr)] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!content-stretch [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!gap-[12px]`}>
          <div className={`grid min-w-0 content-center gap-2 rounded-none border border-[var(--border)] bg-[var(--surface)] px-4 py-3 ${ownerLandscapeClass}:h-full ${ownerLandscapeClass}:min-h-[148px] ${ownerLandscapeClass}:gap-[8px] ${ownerLandscapeClass}:px-3 ${ownerLandscapeClass}:py-[14px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!h-full [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!min-h-[148px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!gap-[8px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!px-3 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!py-[14px]`}>
            <span className={`text-[0.78rem] text-[var(--foreground-soft)] ${ownerLandscapeClass}:text-[0.68rem] ${ownerLandscapeClass}:leading-tight [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!text-[0.68rem] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!leading-tight`}>บิลล่าสุด</span>
            {latestReceipt ? (
              <>
                <strong className={`min-w-0 break-all text-[1rem] leading-[1.25] text-[var(--foreground)] ${ownerLandscapeClass}:text-[0.86rem] ${ownerLandscapeClass}:leading-tight [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!text-[0.86rem] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!leading-tight`}>{latestReceipt.code}</strong>
                <span className={`text-[0.84rem] text-[var(--foreground-soft)] ${ownerLandscapeClass}:hidden`}>{formatDateTime(latestReceipt.createdAt)} / {formatBaht(latestReceipt.total)}</span>
                <Link href="/owner/receipts" className={`${secondaryButtonClass} mt-1 min-h-[40px] rounded-xl text-[0.9rem] ${ownerLandscapeClass}:mt-0 ${ownerLandscapeClass}:min-h-[36px] ${ownerLandscapeClass}:px-3 ${ownerLandscapeClass}:py-[6px] ${ownerLandscapeClass}:text-[0.82rem] ${ownerLandscapeClass}:leading-none [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!mt-0 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!min-h-[36px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!px-3 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!py-[6px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!text-[0.82rem] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!leading-none`}>
                  เปิดใบเสร็จ
                </Link>
              </>
            ) : (
              <span className="text-[0.9rem] text-[var(--foreground-soft)]">ยังไม่มีบิลล่าสุด</span>
            )}
          </div>

          <div className={`grid min-w-0 content-center gap-2 rounded-none border border-[var(--border)] bg-[var(--surface)] px-4 py-3 ${ownerLandscapeClass}:h-full ${ownerLandscapeClass}:min-h-[132px] ${ownerLandscapeClass}:gap-[8px] ${ownerLandscapeClass}:px-3 ${ownerLandscapeClass}:py-[14px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!h-full [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!min-h-[132px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!gap-[8px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!px-3 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!py-[14px]`}>
            <span className={`text-[0.78rem] text-[var(--foreground-soft)] ${ownerLandscapeClass}:text-[0.68rem] ${ownerLandscapeClass}:leading-tight [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!text-[0.68rem] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!leading-tight`}>ตะกร้าค้าง</span>
            <strong className={`text-[1rem] text-[var(--foreground)] ${ownerLandscapeClass}:text-[0.88rem] ${ownerLandscapeClass}:leading-tight [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!text-[0.88rem] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!leading-tight`}>{cartState.count > 0 ? `${cartState.count} ชิ้น / ${formatBaht(cartState.total)}` : "ไม่มีตะกร้าค้าง"}</strong>
            <Link href={cartState.count > 0 ? "/owner/payments" : "/owner/sales"} className={`${secondaryButtonClass} mt-1 min-h-[40px] rounded-xl text-[0.9rem] ${ownerLandscapeClass}:mt-0 ${ownerLandscapeClass}:min-h-[36px] ${ownerLandscapeClass}:px-3 ${ownerLandscapeClass}:py-[6px] ${ownerLandscapeClass}:text-[0.82rem] ${ownerLandscapeClass}:leading-none [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!mt-0 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!min-h-[36px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!px-3 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!py-[6px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!text-[0.82rem] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!leading-none`}>
              {cartState.count > 0 ? "ไปชำระเงิน" : "เริ่มขาย"}
            </Link>
          </div>

          <div className={`grid min-w-0 content-center gap-2 rounded-none border border-[var(--border)] bg-[var(--surface)] px-4 py-3 ${ownerLandscapeClass}:h-full ${ownerLandscapeClass}:min-h-[148px] ${ownerLandscapeClass}:gap-[8px] ${ownerLandscapeClass}:px-3 ${ownerLandscapeClass}:py-[14px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!h-full [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!min-h-[148px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!gap-[8px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!px-3 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!py-[14px]`}>
            <span className={`text-[0.78rem] text-[var(--foreground-soft)] ${ownerLandscapeClass}:text-[0.68rem] ${ownerLandscapeClass}:leading-tight [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!text-[0.68rem] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!leading-tight`}>การรับชำระเงิน</span>
            <strong className={`text-[1rem] text-[var(--foreground)] ${ownerLandscapeClass}:text-[0.88rem] ${ownerLandscapeClass}:leading-tight [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!text-[0.88rem] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!leading-tight`}>{paymentReady ? "พร้อมรับชำระ" : "ยังตั้งค่าไม่ครบ"}</strong>
            <span className={`text-[0.84rem] text-[var(--foreground-soft)] ${ownerLandscapeClass}:hidden`}>QR: {qrReady ? "พร้อม" : "ยังไม่พร้อม"} / โอนเงิน: {transferReady ? "พร้อม" : "ยังไม่พร้อม"}</span>
            <Link href="/owner/settings" className={`${secondaryButtonClass} mt-1 min-h-[40px] rounded-xl text-[0.9rem] ${ownerLandscapeClass}:mt-0 ${ownerLandscapeClass}:min-h-[36px] ${ownerLandscapeClass}:px-3 ${ownerLandscapeClass}:py-[6px] ${ownerLandscapeClass}:text-[0.82rem] ${ownerLandscapeClass}:leading-none [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!mt-0 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!min-h-[36px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!px-3 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!py-[6px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!text-[0.82rem] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!leading-none`}>
              ตั้งค่าการรับเงิน
            </Link>
          </div>
        </div>

        <section className={`hidden min-w-0 content-start gap-[12px] border-t border-[var(--border-muted)] pt-[14px] ${ownerLandscapeClass}:self-end ${ownerLandscapeClass}:grid ${ownerLandscapeClass}:gap-[9px] ${ownerLandscapeClass}:pt-[10px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!self-end [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!grid [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!gap-[9px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!pt-[10px]`}>
          <div>
            <p className={`m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)] ${ownerLandscapeClass}:text-[0.62rem] ${ownerLandscapeClass}:tracking-[0.18em] ${ownerLandscapeClass}:leading-none [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!text-[0.62rem] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!tracking-[0.18em] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!leading-none`}>Product Operations</p>
            <strong className={`my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-[var(--foreground)] ${ownerLandscapeClass}:my-[5px] ${ownerLandscapeClass}:text-[1.14rem] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!my-[5px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!text-[1.14rem]`}>สถานะสินค้า</strong>
          </div>
          <div className={`grid min-w-0 grid-cols-2 gap-[8px] ${ownerLandscapeClass}:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] ${ownerLandscapeClass}:gap-[6px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!grid-cols-[minmax(0,1fr)_minmax(0,1fr)] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!gap-[6px]`}>
            {[
              ["พร้อมขาย", productStatus.ready],
              ["ปิดขาย", productStatus.closed],
              ["Stock ต่ำ", productStatus.lowStock],
              ["ข้อมูลไม่ครบ", productStatus.incomplete],
            ].map(([label, value]) => (
              <div key={label} className={`min-w-0 rounded-none border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2.5 ${ownerLandscapeClass}:min-h-[70px] ${ownerLandscapeClass}:px-[10px] ${ownerLandscapeClass}:py-[11px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!min-h-[70px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!px-[10px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!py-[11px]`}>
                <span className={`block truncate text-[0.76rem] text-[var(--foreground-soft)] ${ownerLandscapeClass}:text-[0.64rem] ${ownerLandscapeClass}:leading-tight [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!text-[0.64rem] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!leading-tight`}>{label}</span>
                <strong className={`mt-1 block text-[1.15rem] text-[var(--foreground)] ${ownerLandscapeClass}:mt-[4px] ${ownerLandscapeClass}:text-[1.05rem] ${ownerLandscapeClass}:leading-none [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!mt-[4px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!text-[1.05rem] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!leading-none`}>{value}</strong>
              </div>
            ))}
          </div>
          <Link href="/owner/menu" className={`${secondaryButtonClass} min-h-[42px] min-w-0 rounded-2xl ${ownerLandscapeClass}:hidden [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:!hidden`}>
            จัดการสินค้า
          </Link>
        </section>

      </aside>
    </div>
  );
}
