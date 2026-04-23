"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { requestJson } from "@/components/product-management-studio/lib";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui-primitives";
import type { OwnerPaymentSettingsValue } from "@/components/owner-settings-client";

type PaymentMethod = "CASH" | "QR" | "CARD" | "TRANSFER" | "OTHER";

type StoredCartItem = {
  productId: string;
  quantity: number;
  product?: {
    id: string;
    code: string;
    name: string;
    category: string;
    price: number;
    imageUrl?: string | null;
  };
};

type CompletedSale = {
  id: string;
  code: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  note: string | null;
  items: Array<{
    id: string;
    productId: string;
    code: string;
    name: string;
    category: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    imageUrl?: string | null;
  }>;
};

type SaleResponse = {
  sale: CompletedSale;
};

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CASH", label: "เงินสด" },
  { value: "QR", label: "QR PromptPay" },
  { value: "CARD", label: "บัตร" },
  { value: "TRANSFER", label: "โอนเงิน" },
];
const salesCartStorageKey = "pos-mans-sales-cart";
const latestSaleStorageKey = "pos-mans-latest-sale";

function formatBaht(value: number) {
  return `฿${value.toLocaleString("th-TH")}`;
}

function promptPayRecipientOptionsLabel(type: OwnerPaymentSettingsValue["promptPayRecipientType"]) {
  if (type === "MOBILE") {
    return "เบอร์พร้อมเพย์";
  }
  if (type === "NATIONAL_ID") {
    return "เลขบัตรประชาชน";
  }
  if (type === "TAX_ID") {
    return "เลขผู้เสียภาษี/นิติบุคคล";
  }
  if (type === "STATIC_QR") {
    return "Static QR จากธนาคาร";
  }
  return "ข้อมูลบัญชีธนาคาร";
}

function emv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16Ccitt(value: string) {
  let crc = 0xffff;
  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function normalizePromptPayProxy(settings: OwnerPaymentSettingsValue) {
  if (settings.promptPayRecipientType === "MOBILE") {
    const id = settings.promptPayMobileId.replace(/\D/g, "");
    return { tag: "01", value: `0066${id.slice(1)}` };
  }

  if (settings.promptPayRecipientType === "NATIONAL_ID") {
    const id = settings.promptPayNationalId.replace(/\D/g, "");
    return { tag: "02", value: id };
  }

  if (settings.promptPayRecipientType === "TAX_ID") {
    const id = settings.promptPayTaxId.replace(/\D/g, "");
    return { tag: "02", value: id };
  }

  return null;
}

function createPromptPayPayload(settings: OwnerPaymentSettingsValue, amount: number) {
  const proxy = normalizePromptPayProxy(settings);
  if (!proxy) {
    return "";
  }

  const merchantAccountInfo = emv("00", "A000000677010111") + emv(proxy.tag, proxy.value);
  const amountText = Math.max(0, amount).toFixed(2);
  const payloadWithoutCrc =
    emv("00", "01") +
    emv("01", "12") +
    emv("29", merchantAccountInfo) +
    emv("53", "764") +
    emv("54", amountText) +
    emv("58", "TH") +
    "6304";

  return `${payloadWithoutCrc}${crc16Ccitt(payloadWithoutCrc)}`;
}

function readLatestSale() {
  const latestSaleRaw = sessionStorage.getItem(latestSaleStorageKey);
  if (!latestSaleRaw) {
    return null;
  }

  try {
    return JSON.parse(latestSaleRaw) as CompletedSale;
  } catch {
    sessionStorage.removeItem(latestSaleStorageKey);
    return null;
  }
}

export function PaymentCheckoutClient({ paymentSettings }: { paymentSettings: OwnerPaymentSettingsValue }) {
  const router = useRouter();
  const [items, setItems] = useState<StoredCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [promptPayQrDataUrl, setPromptPayQrDataUrl] = useState("");
  const [billScrollMetric, setBillScrollMetric] = useState({ top: 0, height: 100, visible: false });
  const billScrollRef = useRef<HTMLDivElement | null>(null);
  const dragScrollRef = useRef({
    active: false,
    pointerId: 0,
    startY: 0,
    scrollTop: 0,
  });

  const subtotal = useMemo(() => items.reduce((total, item) => total + (item.product?.price || 0) * item.quantity, 0), [items]);
  const currentTotal = Math.max(0, subtotal - discount + tax);
  const billSubtotal = completedSale ? completedSale.subtotal : subtotal;
  const billDiscount = completedSale ? completedSale.discount : discount;
  const billTax = completedSale ? completedSale.tax : tax;
  const billTotal = completedSale ? completedSale.total : currentTotal;
  const displayedPaymentMethod = completedSale?.paymentMethod ?? paymentMethod;
  const qrPaymentSelected = displayedPaymentMethod === "QR";
  const dynamicPromptPayReady =
    paymentSettings.promptPayEnabled &&
    ["MOBILE", "NATIONAL_ID", "TAX_ID"].includes(paymentSettings.promptPayRecipientType) &&
    Boolean(
      paymentSettings.promptPayRecipientType === "MOBILE"
        ? paymentSettings.promptPayMobileId
        : paymentSettings.promptPayRecipientType === "NATIONAL_ID"
          ? paymentSettings.promptPayNationalId
          : paymentSettings.promptPayTaxId,
    );
  const staticQrReady = paymentSettings.promptPayEnabled && paymentSettings.promptPayRecipientType === "STATIC_QR" && Boolean(paymentSettings.paymentQrImageUrl);
  const bankFallbackReady =
    paymentSettings.promptPayEnabled &&
    paymentSettings.promptPayRecipientType === "BANK_ACCOUNT" &&
    Boolean(paymentSettings.bankName && paymentSettings.bankAccountName && paymentSettings.bankAccountNumber);
  const qrPaymentConfigured = dynamicPromptPayReady || staticQrReady || bankFallbackReady;
  const itemCount = useMemo(
    () => (completedSale ? completedSale.items.reduce((totalItems, item) => totalItems + item.quantity, 0) : items.reduce((totalItems, item) => totalItems + item.quantity, 0)),
    [completedSale, items],
  );
  const billItems = completedSale
    ? completedSale.items.map((item) => ({
        key: item.id,
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        imageUrl: item.imageUrl || items.find((cartItem) => cartItem.productId === item.productId)?.product?.imageUrl || null,
      }))
    : items.map((item) => ({
        key: item.productId,
        name: item.product?.name || item.productId,
        unitPrice: item.product?.price || 0,
        quantity: item.quantity,
        lineTotal: (item.product?.price || 0) * item.quantity,
        imageUrl: item.product?.imageUrl || null,
      }));

  useEffect(() => {
    const raw = sessionStorage.getItem(salesCartStorageKey);
    if (!raw) {
      setCompletedSale(readLatestSale());
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { items?: StoredCartItem[] };
      const cartItems = Array.isArray(parsed.items) ? parsed.items : [];
      setItems(cartItems);
      if (cartItems.length > 0) {
        setCompletedSale(null);
      } else {
        setCompletedSale(readLatestSale());
      }
    } catch {
      setItems([]);
      setCompletedSale(readLatestSale());
    }
  }, []);

  useLayoutEffect(() => {
    updateBillScrollbar();
  }, [billItems.length]);

  useEffect(() => {
    let cancelled = false;

    async function generatePromptPayQr() {
      if (!qrPaymentSelected || !dynamicPromptPayReady || completedSale) {
        setPromptPayQrDataUrl("");
        return;
      }

      const payload = createPromptPayPayload(paymentSettings, billTotal);
      if (!payload) {
        setPromptPayQrDataUrl("");
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(payload, {
          errorCorrectionLevel: "M",
          margin: 2,
          scale: 7,
          color: {
            dark: "#111827",
            light: "#ffffff",
          },
        });
        if (!cancelled) {
          setPromptPayQrDataUrl(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setPromptPayQrDataUrl("");
        }
      }
    }

    generatePromptPayQr();

    return () => {
      cancelled = true;
    };
  }, [billTotal, completedSale, dynamicPromptPayReady, paymentSettings, qrPaymentSelected]);

  function updateBillScrollbar() {
    const node = billScrollRef.current;
    if (!node) {
      return;
    }

    const maxScroll = node.scrollHeight - node.clientHeight;
    if (maxScroll <= 0) {
      setBillScrollMetric({ top: 0, height: 100, visible: false });
      return;
    }

    const height = Math.max(14, (node.clientHeight / node.scrollHeight) * 100);
    const top = (node.scrollTop / maxScroll) * (100 - height);
    setBillScrollMetric({ top, height, visible: true });
  }

  function handleBillPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target instanceof HTMLElement && event.target.closest("button"))) {
      return;
    }

    const target = event.currentTarget;
    dragScrollRef.current = {
      active: true,
      pointerId: event.pointerId,
      startY: event.clientY,
      scrollTop: target.scrollTop,
    };
    target.setPointerCapture(event.pointerId);
    target.dataset.dragging = "true";
  }

  function handleBillPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragScrollRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.currentTarget.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
    updateBillScrollbar();
  }

  function stopBillDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragScrollRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) {
      return;
    }

    dragScrollRef.current.active = false;
    event.currentTarget.dataset.dragging = "false";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function renderQrPaymentInstructions(compact = false) {
    if (!qrPaymentSelected) {
      return null;
    }

    const wrapperClass = compact ? "grid content-start justify-items-center gap-4" : "grid gap-3 rounded-none border border-[rgba(100,120,160,0.16)] bg-[rgba(255,255,255,0.03)] p-4";

    return (
      <div className={wrapperClass}>
        {!compact ? (
          <div className="flex items-start justify-between gap-3">
            <div>
              <strong className="block text-white">QR PromptPay / โอนเงิน</strong>
              <span className="text-[0.86rem] leading-[1.5] text-[var(--foreground-soft)]">
                {completedSale ? "วิธีรับเงินของบิลล่าสุด" : "ให้ลูกค้าสแกนหรือโอน แล้วตรวจสลิปก่อนกดยืนยัน"}
              </span>
            </div>
            <strong className="whitespace-nowrap text-white">{formatBaht(billTotal)}</strong>
          </div>
        ) : null}

        {!paymentSettings.promptPayEnabled ? (
          <div className="rounded-[10px] border border-[rgba(232,93,117,0.28)] bg-[rgba(232,93,117,0.08)] px-3 py-2 text-[0.86rem] font-bold text-[#ff8fa2]">
            ยังไม่ได้เปิดใช้ QR PromptPay ในหน้าตั้งค่า
          </div>
        ) : dynamicPromptPayReady ? (
          <div className={compact ? "grid justify-items-center gap-4 text-center" : "grid grid-cols-[148px_minmax(0,1fr)] items-center gap-4 max-[720px]:grid-cols-1"}>
            {promptPayQrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={promptPayQrDataUrl} alt="PromptPay QR" className={compact ? "aspect-square w-full max-w-[240px] bg-white p-3" : "h-[148px] w-[148px] rounded-[12px] border border-white/10 bg-white p-2"} />
            ) : (
              <div className={compact ? "grid aspect-square w-full max-w-[240px] place-items-center border border-dashed border-[rgba(220,208,255,0.28)] text-center text-[0.86rem] text-[var(--foreground-soft)]" : "grid h-[148px] w-[148px] place-items-center rounded-[12px] border border-dashed border-[rgba(100,120,160,0.28)] text-center text-[0.82rem] text-[var(--foreground-soft)]"}>
                กำลังสร้าง QR
              </div>
            )}
            <div className={compact ? "grid w-full max-w-[240px] gap-3 text-[0.9rem] leading-[1.45] text-[rgba(229,223,255,0.78)]" : "grid gap-2 text-[0.9rem] text-[var(--foreground-soft)]"}>
              {compact ? (
                <div className="flex items-start justify-between gap-4 text-left">
                  <div className="grid min-w-0 gap-1.5">
                    <strong className="block leading-[1.28] text-white">QR PromptPay / โอนเงิน</strong>
                    <span className="text-[0.78rem] leading-[1.55] text-[var(--foreground-soft)]">ยอดถูกฝังใน QR แล้ว</span>
                  </div>
                  <strong className="whitespace-nowrap text-white">{formatBaht(billTotal)}</strong>
                </div>
              ) : (
                <>
                  <span>ประเภท: {promptPayRecipientOptionsLabel(paymentSettings.promptPayRecipientType)}</span>
                  <span>ยอดถูกฝังใน QR แล้ว</span>
                </>
              )}
              <span className="block pt-1 text-center font-bold leading-[1.35] text-[#ffcf7a]">ตรวจสลิปก่อนยืนยัน</span>
            </div>
          </div>
        ) : staticQrReady ? (
          <div className={compact ? "grid justify-items-center gap-4 text-center" : "grid grid-cols-[148px_minmax(0,1fr)] items-center gap-4 max-[720px]:grid-cols-1"}>
            <span className={compact ? "aspect-square w-full max-w-[240px] bg-cover bg-center bg-white" : "h-[148px] w-[148px] rounded-[12px] border border-white/10 bg-cover bg-center bg-white"} style={{ backgroundImage: `url(${paymentSettings.paymentQrImageUrl})` }} />
            <div className={compact ? "grid w-full max-w-[240px] gap-3 text-[0.9rem] leading-[1.45] text-[rgba(229,223,255,0.78)]" : "grid gap-2 text-[0.9rem] text-[var(--foreground-soft)]"}>
              {compact ? (
                <div className="flex items-start justify-between gap-4 text-left">
                  <div className="grid min-w-0 gap-1.5">
                    <strong className="block leading-[1.28] text-white">Static QR จากธนาคาร</strong>
                    <span className="text-[0.78rem] leading-[1.55] text-[var(--foreground-soft)]">ให้ลูกค้าโอนยอดนี้</span>
                  </div>
                  <strong className="whitespace-nowrap text-white">{formatBaht(billTotal)}</strong>
                </div>
              ) : (
                <>
                  <span>Static QR จากธนาคาร</span>
                  <span>ให้ลูกค้าโอน {formatBaht(billTotal)}</span>
                </>
              )}
              <span className="block pt-1 text-center font-bold leading-[1.35] text-[#ffcf7a]">ตรวจสลิปก่อนยืนยัน</span>
            </div>
          </div>
        ) : bankFallbackReady ? (
          <div className="grid gap-2 rounded-[10px] border border-[rgba(100,120,160,0.14)] bg-[rgba(14,18,28,0.48)] p-3 text-[0.86rem]">
            <div className="flex justify-between gap-3"><span className="text-[var(--foreground-soft)]">ธนาคาร</span><strong>{paymentSettings.bankName}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-[var(--foreground-soft)]">ชื่อบัญชี</span><strong>{paymentSettings.bankAccountName}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-[var(--foreground-soft)]">เลขบัญชี</span><strong>{paymentSettings.bankAccountNumber}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-[var(--foreground-soft)]">ยอดโอน</span><strong>{formatBaht(billTotal)}</strong></div>
          </div>
        ) : (
          <div className="rounded-[10px] border border-[rgba(232,93,117,0.28)] bg-[rgba(232,93,117,0.08)] px-3 py-2 text-[0.84rem] font-bold text-[#ff8fa2]">
            ตั้งค่ารับเงินยังไม่ครบ
          </div>
        )}
      </div>
    );
  }

  async function handleConfirmPayment() {
    if (items.length === 0 || busy) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await requestJson<SaleResponse>("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          paymentMethod,
          discount,
          tax,
          note,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      const completedSaleWithImages: CompletedSale = {
        ...response.sale,
        items: response.sale.items.map((saleItem) => ({
          ...saleItem,
          imageUrl: items.find((cartItem) => cartItem.productId === saleItem.productId)?.product?.imageUrl || null,
        })),
      };

      sessionStorage.removeItem(salesCartStorageKey);
      sessionStorage.setItem(latestSaleStorageKey, JSON.stringify(completedSaleWithImages));
      setCompletedSale(completedSaleWithImages);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "ยืนยันการชำระไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px] gap-[18px] max-[1280px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] max-[1180px]:grid-cols-1">
      <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-[16px] rounded-none border border-[var(--border)] bg-[rgba(22,27,38,0.76)] px-5 py-[18px] shadow-[var(--shadow-soft)]">
        <div>
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Bill Summary</p>
          <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-white">
            {completedSale ? "ชำระเงินสำเร็จ (ล่าสุด)" : items.length > 0 ? "รายการรอชำระ" : "ยังไม่มีรายการ"}
          </strong>
          <p className="m-0 text-[0.95rem] leading-[1.65] text-[var(--foreground-soft)]">
            {completedSale ? `บันทึกบิล ${completedSale.code} เรียบร้อย` : "ตรวจรายการก่อนยืนยันการชำระเงิน"}
          </p>
        </div>

        <div className="relative min-h-0">
          {billItems.length > 0 ? (
            <>
              <div
                ref={billScrollRef}
                className={
                  billScrollMetric.visible
                    ? "sales-cart-scroll grid h-full min-h-0 cursor-grab select-none content-start gap-3 overflow-y-auto overflow-x-hidden py-0 pl-0 pr-4 active:cursor-grabbing"
                    : "grid h-full min-h-0 select-none content-start gap-3 overflow-hidden py-0 pl-0 pr-0"
                }
                onScroll={updateBillScrollbar}
                onPointerDown={handleBillPointerDown}
                onPointerMove={handleBillPointerMove}
                onPointerUp={stopBillDrag}
                onPointerCancel={stopBillDrag}
                onPointerLeave={stopBillDrag}
              >
                {billItems.map((item) => (
                  <div key={item.key} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 rounded-none border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.03)] p-3">
                    {item.imageUrl ? (
                      <span className="h-[52px] w-[52px] rounded-[10px] border border-[rgba(100,120,160,0.14)] bg-cover bg-center" style={{ backgroundImage: `url(${item.imageUrl})` }} />
                    ) : (
                      <div className="h-[52px] w-[52px] rounded-[10px] border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.04)]" />
                    )}
                    <div className="grid min-w-0 gap-1">
                      <strong className="truncate text-base leading-[1.2] text-white">{item.name}</strong>
                      <span className="text-[0.92rem] text-[var(--foreground-soft)]">{formatBaht(item.unitPrice)} x {item.quantity}</span>
                    </div>
                    <strong className="text-base leading-[1.2] text-white">{formatBaht(item.lineTotal)}</strong>
                  </div>
                ))}
              </div>
              {billScrollMetric.visible ? (
                <span className="pointer-events-none absolute bottom-0 right-0 top-0 w-[7px] bg-[rgba(15,19,29,0.78)]">
                  <span
                    className="absolute left-0 w-full rounded-full bg-[linear-gradient(180deg,rgba(240,106,223,0.98),rgba(169,108,255,0.94))] shadow-[rgba(240,106,223,0.24)_0_0_14px]"
                    style={{ top: `${billScrollMetric.top}%`, height: `${billScrollMetric.height}%` }}
                  />
                </span>
              ) : null}
            </>
          ) : (
            <div className="grid min-h-[220px] place-items-center rounded-none border border-dashed border-[rgba(100,120,160,0.2)] text-center text-[var(--foreground-soft)]">
              กลับไปหน้าขายเพื่อเพิ่มสินค้าเข้าตะกร้า
            </div>
          )}
        </div>

        <div className="grid gap-3 border-t border-t-[var(--border)] pt-3">
          {[
            ["ยอดอาหาร", formatBaht(billSubtotal)],
            ["ส่วนลด", formatBaht(billDiscount)],
            ["ภาษี", formatBaht(billTax)],
            ["สุทธิ", formatBaht(billTotal)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <span className="text-[0.95rem] text-[var(--foreground-soft)]">{label}</span>
              <strong className="text-base leading-[1.2] text-white">{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="grid min-h-0 grid-rows-[auto_auto_1fr_auto] gap-[16px] rounded-none border border-[var(--border)] bg-[rgba(22,27,38,0.76)] px-5 py-[18px] shadow-[var(--shadow-soft)]">
        <div>
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Payment Methods</p>
          <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-white">{completedSale ? "วิธีชำระล่าสุด" : "เลือกวิธีชำระ"}</strong>
          <p className="m-0 text-[0.95rem] leading-[1.65] text-[var(--foreground-soft)]">
            {completedSale ? "บิลนี้ชำระสำเร็จแล้ว รายละเอียดถูกล็อกไว้" : "เลือกวิธีรับเงินก่อนบันทึกบิลจริง"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
          {paymentMethods.map((method) => (
            <button
              key={method.value}
              type="button"
              className={displayedPaymentMethod === method.value ? `${primaryButtonClass} min-h-[52px] rounded-2xl` : `${secondaryButtonClass} min-h-[52px] rounded-2xl`}
              onClick={() => setPaymentMethod(method.value)}
              disabled={Boolean(completedSale)}
            >
              {method.label}
            </button>
          ))}
        </div>

        <div className="grid content-start gap-4">
          <label className="grid gap-2">
            <span className="text-[0.92rem] text-[var(--foreground-soft)]">ส่วนลด</span>
            <input
              className={inputClass}
              type="number"
              min={0}
              max={subtotal}
              value={billDiscount}
              onChange={(event) => setDiscount(Math.max(0, Number(event.target.value) || 0))}
              disabled={Boolean(completedSale)}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-[0.92rem] text-[var(--foreground-soft)]">ภาษี</span>
            <input className={inputClass} type="number" min={0} value={billTax} onChange={(event) => setTax(Math.max(0, Number(event.target.value) || 0))} disabled={Boolean(completedSale)} />
          </label>
          <label className="grid gap-2">
            <span className="text-[0.92rem] text-[var(--foreground-soft)]">หมายเหตุบิล</span>
            <textarea
              className="min-h-[116px] rounded-[14px] border border-[rgba(100,120,160,0.22)] bg-[rgba(14,18,28,0.7)] px-[14px] py-3 text-[var(--foreground)] outline-none transition placeholder:text-[#556070] focus:border-[rgba(108,92,231,0.55)] focus:shadow-[inset_0_0_0_1px_var(--ring)] disabled:cursor-not-allowed disabled:opacity-70"
              value={completedSale ? completedSale.note || "" : note}
              onChange={(event) => setNote(event.target.value)}
              disabled={Boolean(completedSale)}
            />
          </label>
          {error ? <div className="rounded-none border border-[rgba(232,93,117,0.32)] bg-[rgba(232,93,117,0.08)] px-3 py-2 text-[0.86rem] font-bold text-[#ff8fa2]">{error}</div> : null}
        </div>

        <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
          <button type="button" className={`${secondaryButtonClass} min-h-[52px] rounded-2xl`} onClick={() => router.push("/owner/sales")}>
            {completedSale ? "เปิดออเดอร์ใหม่" : "กลับไปขาย"}
          </button>
          <button type="button" className={`${primaryButtonClass} min-h-[52px] rounded-2xl`} disabled={items.length === 0 || busy || discount > subtotal || Boolean(completedSale) || (paymentMethod === "QR" && !qrPaymentConfigured)} onClick={handleConfirmPayment}>
            {busy ? "กำลังยืนยัน..." : "ยืนยันการชำระ"}
          </button>
        </div>
      </section>

      <section className="grid h-fit gap-[16px] rounded-none border border-[var(--border)] bg-[rgba(22,27,38,0.76)] px-5 py-[18px] shadow-[var(--shadow-soft)] max-[1280px]:col-span-2 max-[1180px]:col-span-1">
        <div>
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Quick Panel</p>
          <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-white">สถานะชำระเงิน</strong>
        </div>
        <div className="grid gap-3">
          {qrPaymentSelected ? (
            renderQrPaymentInstructions(true)
          ) : (
            <>
              <div className="rounded-none border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.03)] p-4">
                <span className="text-[0.92rem] text-[var(--foreground-soft)]">จำนวนรายการ</span>
                <strong className="mt-2 block text-[1.2rem] leading-[1.1] text-white">{billItems.length} รายการ / {itemCount} ชิ้น</strong>
              </div>
              <div className="rounded-none border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.03)] p-4">
                <span className="text-[0.92rem] text-[var(--foreground-soft)]">ยอดสุทธิ</span>
                <strong className="mt-2 block text-[1.2rem] leading-[1.1] text-white">{formatBaht(billTotal)}</strong>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
