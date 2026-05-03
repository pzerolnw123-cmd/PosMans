"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useBackofficeShellAlert } from "@/components/backoffice-shell";
import { openCustomerDisplayWindow, readStoredCustomerDisplay, storeCustomerDisplay, type CustomerDisplayLink } from "@/components/customer-display-session";
import { invalidateProductListCache, requestJson } from "@/components/product-management-studio/lib";
import { LoadingState, primaryButtonClass, secondaryButtonClass } from "@/components/ui-primitives";
import type { OwnerPaymentSettingsValue } from "@/components/owner-settings-client";
import { readActiveOwnerTheme, subscribeOwnerTheme } from "@/lib/owner-theme";

import type { CompletedSale, PaymentMethod, SaleResponse, StoredCartItem } from "./shared";
import {
  createPromptPayPayload,
  formatBaht,
  latestSaleStorageKey,
  paymentMethods,
  readLatestSale,
  salesCartStorageKey,
} from "./shared";
import { PaymentCheckoutPanels } from "./payment-checkout-panels";

export function PaymentCheckoutClient({ paymentSettings }: { paymentSettings: OwnerPaymentSettingsValue }) {
  const router = useRouter();
  const { setShellAlert } = useBackofficeShellAlert();
  const [items, setItems] = useState<StoredCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [confirmPaymentOpen, setConfirmPaymentOpen] = useState(false);
  const [customerDisplay, setCustomerDisplay] = useState<CustomerDisplayLink | null>(null);
  const [customerDisplayBusy, setCustomerDisplayBusy] = useState(false);
  const [promptPayQrDataUrl, setPromptPayQrDataUrl] = useState("");
  const [activeTheme, setActiveTheme] = useState(() => readActiveOwnerTheme());
  const [billScrollMetric, setBillScrollMetric] = useState({ top: 0, height: 100, visible: false });
  const billScrollRef = useRef<HTMLDivElement | null>(null);
  const dragScrollRef = useRef({
    active: false,
    pointerId: 0,
    startY: 0,
    scrollTop: 0,
  });
  const [mounted, setMounted] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState<number>(0);

  const [receivedDraft, setReceivedDraft] = useState<string | null>(null);
  const [discountDraft, setDiscountDraft] = useState<string | null>(null);
  const [taxDraft, setTaxDraft] = useState<string | null>(null);

  const subtotal = useMemo(() => items.reduce((total, item) => total + (item.product?.price || 0) * item.quantity, 0), [items]);
  const discount = Math.floor(subtotal * (discountPercent / 100));
  const tax = Math.floor(subtotal * (taxPercent / 100));
  const currentTotal = Math.max(0, subtotal - discount + tax);
  const billSubtotal = completedSale ? completedSale.subtotal : subtotal;
  const billDiscount = completedSale ? completedSale.discount : discount;
  const billTax = completedSale ? completedSale.tax : tax;
  const billTotal = completedSale ? completedSale.total : currentTotal;
  const displayedPaymentMethod = completedSale?.paymentMethod ?? paymentMethod;
  const hasPendingItems = !completedSale && items.length > 0;
  const qrPaymentSelected = displayedPaymentMethod === "QR";
  const transferSelected = displayedPaymentMethod === "TRANSFER";
  const bankInfoFilled = Boolean(paymentSettings.bankName && paymentSettings.bankAccountName && paymentSettings.bankAccountNumber);
  const transferPaymentConfigured = paymentSettings.promptPayEnabled && bankInfoFilled;
  const changeAmount = Math.max(0, receivedAmount - billTotal);
  const cashPaymentMissingReceivedAmount = !completedSale && paymentMethod === "CASH" && receivedAmount <= 0;

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
  const qrPaymentConfigured = dynamicPromptPayReady || staticQrReady;
  const selectedQrDataUrl =
    paymentMethod === "QR"
      ? promptPayQrDataUrl || (staticQrReady ? paymentSettings.paymentQrImageUrl : "")
      : paymentMethod === "TRANSFER"
        ? paymentSettings.paymentQrImageUrl
        : "";
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
    async function initCart() {
      try {
        const storedDisplay = readStoredCustomerDisplay();
        if (storedDisplay) {
          setCustomerDisplay(storedDisplay);
        }

        const raw = sessionStorage.getItem(salesCartStorageKey);
        if (!raw) {
          setCompletedSale(readLatestSale());
          return;
        }

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
      } finally {
        setMounted(true);
      }
    }
    initCart();
  }, []);

  useLayoutEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      updateBillScrollbar();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [billItems.length]);

  useEffect(() => {
    function syncActiveTheme() {
      setActiveTheme(readActiveOwnerTheme());
    }

    syncActiveTheme();
    return subscribeOwnerTheme(syncActiveTheme);
  }, []);

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
        const rootStyle = getComputedStyle(document.documentElement);
        const qrForeground = rootStyle.getPropertyValue("--qr-foreground").trim() || rootStyle.getPropertyValue("--brand").trim();
        const qrBackground = rootStyle.getPropertyValue("--qr-background").trim() || rootStyle.getPropertyValue("--foreground-inverse").trim();
        const { toDataURL } = await import("qrcode");
        const dataUrl = await toDataURL(payload, {
          errorCorrectionLevel: "M",
          margin: 2,
          scale: 7,
          color: {
            dark: qrForeground,
            light: qrBackground,
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
  }, [activeTheme, billTotal, completedSale, dynamicPromptPayReady, paymentSettings, qrPaymentSelected]);

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

  const updateCustomerDisplay = useCallback(
    async (payload: CustomerDisplayStateUpdate) => {
      if (!customerDisplay) {
        return;
      }

      try {
        await requestJson(`/api/customer-displays/${encodeURIComponent(customerDisplay.id)}/state`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } catch {
        setShellAlert({
          tone: "danger",
          message: "ซิงก์จอลูกค้าไม่สำเร็จ กรุณาลองอีกครั้ง",
        });
      }
    },
    [customerDisplay, setShellAlert],
  );

  async function handleOpenCustomerDisplay() {
    if (customerDisplay) {
      openCustomerDisplayWindow(customerDisplay.url);
      return;
    }

    setCustomerDisplayBusy(true);
    try {
      const response = await requestJson<CustomerDisplayCreateResponse>("/api/customer-displays", {
        method: "POST",
        body: JSON.stringify({ name: "จอลูกค้า" }),
      });
      const url = `${window.location.origin}/display/${encodeURIComponent(response.display.id)}?token=${encodeURIComponent(response.token)}`;
      const displayLink = { id: response.display.id, token: response.token, url };
      setCustomerDisplay(displayLink);
      storeCustomerDisplay(displayLink);
      openCustomerDisplayWindow(url);
    } catch (displayError) {
      setShellAlert({
        tone: "danger",
        message: displayError instanceof Error ? displayError.message : "เปิดจอลูกค้าไม่สำเร็จ",
      });
    } finally {
      setCustomerDisplayBusy(false);
    }
  }

  function handleBackToSales() {
    void updateCustomerDisplay({ status: "IDLE" });
    router.push("/owner/sales");
  }

  async function handleConfirmPayment() {
    if (items.length === 0 || busy || cashPaymentMissingReceivedAmount) {
      return;
    }

    setConfirmPaymentOpen(false);
    setBusy(true);
    setError("");
    try {
      const normalizedNote = note.trim();
      const response = await requestJson<SaleResponse>("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          paymentMethod,
          discount,
          tax,
          note: normalizedNote.length > 0 ? normalizedNote : null,
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
      invalidateProductListCache();
      setCompletedSale(completedSaleWithImages);
      setReceivedAmount(0);
      setReceivedDraft(null);
      setDiscountDraft(null);
      setTaxDraft(null);
      setShellAlert({
        tone: "success",
        message: `ยืนยันการชำระเงินสำเร็จ บันทึกบิล ${completedSaleWithImages.code} เรียบร้อยแล้ว`,
      });
      void updateCustomerDisplay({
        status: "SUCCESS",
        amount: completedSaleWithImages.total,
        paymentMethod: completedSaleWithImages.paymentMethod,
        message: "ชำระเงินสำเร็จ ขอบคุณครับ",
        saleCode: completedSaleWithImages.code,
      });
      window.setTimeout(() => {
        void updateCustomerDisplay({ status: "IDLE" });
      }, 5000);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "ยืนยันการชำระไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!customerDisplay || completedSale) {
      return;
    }

    if (!hasPendingItems) {
      const timeoutId = window.setTimeout(() => {
        void updateCustomerDisplay({ status: "IDLE" });
      }, 150);

      return () => window.clearTimeout(timeoutId);
    }

    const shouldShowPayment = (paymentMethod === "QR" && qrPaymentConfigured && Boolean(selectedQrDataUrl)) || (paymentMethod === "TRANSFER" && transferPaymentConfigured);

    const timeoutId = window.setTimeout(() => {
      if (!shouldShowPayment) {
        void updateCustomerDisplay({ status: "IDLE" });
        return;
      }

      void updateCustomerDisplay({
        status: "PAYMENT",
        amount: billTotal,
        paymentMethod,
        qrDataUrl: selectedQrDataUrl || null,
        message: paymentMethod === "TRANSFER" ? "โอนเงินตามยอด แล้วแจ้งพนักงานหลังโอนสำเร็จ" : "สแกนเพื่อชำระเงิน แล้วแจ้งพนักงานหลังโอนสำเร็จ",
      });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [billTotal, completedSale, customerDisplay, hasPendingItems, paymentMethod, selectedQrDataUrl, qrPaymentConfigured, staticQrReady, transferPaymentConfigured, updateCustomerDisplay]);

  function handleConfirmPaymentRequest() {
    if (items.length === 0 || busy || cashPaymentMissingReceivedAmount) {
      return;
    }

    setError("");
    setConfirmPaymentOpen(true);
  }

  if (!mounted) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 rounded-none border border-dashed border-[var(--border)] bg-[var(--panel-subtle)]">
        <LoadingState
          size={64}
          label="กำลังตรวจสอบรายการ..."
          description="ระบบกำลังอ่านข้อมูลตะกร้าและบิลล่าสุด"
        />
      </div>
    );
  }

  const paymentMethodLabel = paymentMethods.find((m) => m.value === displayedPaymentMethod)?.label || "อื่นๆ";

  return (
    <>
      <div className="grid h-full min-h-0 grid-cols-[minmax(240px,1fr)_minmax(280px,1.08fr)_240px] gap-[14px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:grid-cols-[minmax(286px,1.1fr)_minmax(204px,0.76fr)_minmax(210px,0.82fr)] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:gap-3 max-[820px]:h-auto max-[820px]:grid-cols-1 max-[820px]:gap-4 [@media(max-height:860px)_and_(max-width:820px)]:h-auto">
        <PaymentCheckoutPanels
          billItems={billItems}
          billScrollMetric={billScrollMetric}
          billScrollRef={billScrollRef}
          billSubtotal={billSubtotal}
          billDiscount={billDiscount}
          billTax={billTax}
          billTotal={billTotal}
          completedSale={completedSale}
          items={items}
          itemCount={itemCount}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          displayedPaymentMethod={displayedPaymentMethod}
          paymentMethodLabel={paymentMethodLabel}
          receivedAmount={receivedAmount}
          setReceivedAmount={setReceivedAmount}
          receivedDraft={receivedDraft}
          setReceivedDraft={setReceivedDraft}
          discountPercent={discountPercent}
          setDiscountPercent={setDiscountPercent}
          discountDraft={discountDraft}
          setDiscountDraft={setDiscountDraft}
          taxPercent={taxPercent}
          setTaxPercent={setTaxPercent}
          taxDraft={taxDraft}
          setTaxDraft={setTaxDraft}
          note={note}
          setNote={setNote}
          error={error}
          busy={busy}
          discount={discount}
          subtotal={subtotal}
          cashPaymentMissingReceivedAmount={cashPaymentMissingReceivedAmount}
          qrPaymentConfigured={qrPaymentConfigured}
          transferPaymentConfigured={transferPaymentConfigured}
          qrPaymentSelected={qrPaymentSelected}
          transferSelected={transferSelected}
          paymentSettings={paymentSettings}
          dynamicPromptPayReady={dynamicPromptPayReady}
          staticQrReady={staticQrReady}
          promptPayQrDataUrl={promptPayQrDataUrl}
          bankInfoFilled={bankInfoFilled}
          changeAmount={changeAmount}
          updateBillScrollbar={updateBillScrollbar}
          handleBillPointerDown={handleBillPointerDown}
          handleBillPointerMove={handleBillPointerMove}
          stopBillDrag={stopBillDrag}
          onBackToSales={handleBackToSales}
          handleConfirmPayment={handleConfirmPaymentRequest}
          customerDisplayControl={
            <CustomerDisplayControl
              displayUrl={customerDisplay?.url || ""}
              busy={customerDisplayBusy}
              onOpen={handleOpenCustomerDisplay}
            />
          }
        />
      </div>
      {confirmPaymentOpen ? (
        <ConfirmPaymentModal
          busy={busy}
          itemCount={itemCount}
          billItemCount={billItems.length}
          billSubtotal={billSubtotal}
          billDiscount={billDiscount}
          billTax={billTax}
          billTotal={billTotal}
          paymentMethodLabel={paymentMethodLabel}
          paymentMethod={paymentMethod}
          receivedAmount={receivedAmount}
          changeAmount={changeAmount}
          onClose={() => setConfirmPaymentOpen(false)}
          onConfirm={handleConfirmPayment}
        />
      ) : null}
    </>
  );
}

type CustomerDisplayCreateResponse = {
  display: {
    id: string;
    name: string;
    status: "IDLE" | "PAYMENT" | "SUCCESS";
  };
  token: string;
};

type CustomerDisplayStateUpdate = {
  status: "IDLE" | "PAYMENT" | "SUCCESS";
  amount?: number;
  paymentMethod?: PaymentMethod;
  qrDataUrl?: string | null;
  message?: string | null;
  saleCode?: string | null;
};

function CustomerDisplayControl({
  displayUrl,
  busy,
  onOpen,
}: {
  displayUrl: string;
  busy: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="grid min-w-0 gap-2 rounded-none border border-[var(--border-subtle)] bg-[var(--panel-subtle)] p-3 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:min-h-[74px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:p-2">
      <div className="grid gap-2 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:gap-1">
        <div className="min-w-0 [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)]:[&_strong]:hidden [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:[&_strong]:hidden">
          <span className="block whitespace-nowrap text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--eyebrow)] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:text-[0.68rem]">Customer Display</span>
          <strong className="mt-1 block text-[0.98rem] leading-tight text-[var(--foreground)]">จอลูกค้า</strong>
        </div>
        <button type="button" className={`${secondaryButtonClass} min-h-[38px] w-full rounded-xl px-3 text-[0.86rem] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:min-h-[32px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:px-2 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:text-[0.8rem]`} onClick={onOpen} disabled={busy}>
          {busy ? "กำลังเปิด..." : displayUrl ? "เปิดอีกครั้ง" : "เปิดจอ"}
        </button>
      </div>
    </div>
  );
}

function ConfirmPaymentModal({
  busy,
  itemCount,
  billItemCount,
  billSubtotal,
  billDiscount,
  billTax,
  billTotal,
  paymentMethodLabel,
  paymentMethod,
  receivedAmount,
  changeAmount,
  onClose,
  onConfirm,
}: {
  busy: boolean;
  itemCount: number;
  billItemCount: number;
  billSubtotal: number;
  billDiscount: number;
  billTax: number;
  billTotal: number;
  paymentMethodLabel: string;
  paymentMethod: PaymentMethod;
  receivedAmount: number;
  changeAmount: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  if (!mounted) {
    return null;
  }

  const paymentHint =
    paymentMethod === "CASH"
      ? `รับเงิน ${formatBaht(receivedAmount)} / เงินทอน ${formatBaht(changeAmount)}`
      : paymentMethod === "QR" || paymentMethod === "TRANSFER"
        ? "ตรวจสอบยอดรับเงินจริงก่อนยืนยัน"
        : "ตรวจสอบยอดรับเงินจริงก่อนยืนยัน";

  return createPortal(
    <div className="fixed inset-0 z-[300] grid place-items-center bg-[var(--modal-backdrop)] p-4 backdrop-blur-[16px]" role="presentation">
      <button className="absolute inset-0 cursor-default [background:var(--modal-brand-glow)]" type="button" aria-label="ปิดหน้าต่างยืนยันการชำระเงิน" onClick={busy ? undefined : onClose} />
      <div className="relative z-[1] grid w-[calc(100vw-32px)] max-w-[390px] gap-5 rounded-none border border-[var(--border)] [background:var(--modal-surface)] p-5 shadow-[var(--modal-shadow)] max-[640px]:gap-4 max-[640px]:p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-payment-title">
        <div className="grid gap-3">
          <p className="m-0 text-[0.7rem] font-bold uppercase tracking-[0.28em] text-[var(--brand-strong)]">Confirm Payment</p>
          <div>
            <h2 id="confirm-payment-title" className="m-0 text-[1.35rem] leading-tight tracking-[-0.04em] text-[var(--foreground)]">
              ยืนยันการชำระเงิน
            </h2>
            <p className="mt-2 mb-0 text-[0.9rem] leading-[1.6] text-[var(--foreground-soft)]">
              ตรวจยอดและวิธีชำระก่อนบันทึกบิล
            </p>
          </div>
        </div>

        <div className="grid gap-3 rounded-none border border-[var(--border)] bg-[var(--panel-subtle)] p-3.5">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[0.86rem] text-[var(--foreground-soft)]">วิธีชำระ</span>
            <strong className="text-right text-[0.98rem] text-[var(--foreground)]">{paymentMethodLabel}</strong>
          </div>
          <div className="flex items-start justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
            <span className="text-[0.86rem] text-[var(--foreground-soft)]">รายการ</span>
            <strong className="text-right text-[0.98rem] text-[var(--foreground)]">
              {billItemCount} รายการ / {itemCount} ชิ้น
            </strong>
          </div>
          <div className="grid gap-2 border-t border-[var(--border-subtle)] pt-3">
            {[
              ["ยอดอาหาร", formatBaht(billSubtotal)],
              ["ส่วนลด", formatBaht(billDiscount)],
              ["ภาษี", formatBaht(billTax)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 text-[0.88rem]">
                <span className="text-[var(--foreground-soft)]">{label}</span>
                <strong className="text-[var(--foreground)]">{value}</strong>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
              <span className="font-bold text-[var(--foreground)]">ยอดสุทธิ</span>
              <strong className="text-[1.25rem] leading-none text-[var(--foreground)]">{formatBaht(billTotal)}</strong>
            </div>
          </div>
          <div className="rounded-none border border-[var(--accent-border)] bg-[var(--accent-surface)] px-3 py-2 text-[0.85rem] font-bold text-[var(--brand-strong)]">
            {paymentHint}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 max-[520px]:grid-cols-1">
          <button type="button" className={`${secondaryButtonClass} min-h-[46px] rounded-2xl`} onClick={onClose} disabled={busy}>
            ยกเลิก
          </button>
          <button type="button" className={`${primaryButtonClass} min-h-[46px] rounded-2xl`} onClick={onConfirm} disabled={busy}>
            {busy ? "กำลังยืนยัน..." : "ยืนยันการชำระ"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
