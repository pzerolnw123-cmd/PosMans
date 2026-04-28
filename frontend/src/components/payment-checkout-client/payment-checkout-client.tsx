"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { useBackofficeShellAlert } from "@/components/backoffice-shell";
import { invalidateProductListCache, requestJson } from "@/components/product-management-studio/lib";
import { Loader } from "@/components/ui-primitives";
import type { OwnerPaymentSettingsValue } from "@/components/owner-settings-client";

import type { CompletedSale, PaymentMethod, SaleResponse, StoredCartItem } from "./shared";
import {
  createPromptPayPayload,
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
  const [promptPayQrDataUrl, setPromptPayQrDataUrl] = useState("");
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

  async function handleConfirmPayment() {
    if (items.length === 0 || busy || cashPaymentMissingReceivedAmount) {
      return;
    }

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
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "ยืนยันการชำระไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 rounded-none border border-dashed border-[var(--border)] bg-[var(--panel-subtle)]">
        <Loader size={64} label="กำลังตรวจสอบออเดอร์" />
        <strong className="text-[1.1rem] tracking-[-0.04em] text-[var(--foreground-soft)]">กำลังตรวจสอบรายการ...</strong>
      </div>
    );
  }

  const paymentMethodLabel = paymentMethods.find((m) => m.value === displayedPaymentMethod)?.label || "อื่นๆ";

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px] gap-[18px] max-[1366px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] max-[1180px]:grid-cols-1 max-[820px]:gap-4">
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
        onBackToSales={() => router.push("/owner/sales")}
        handleConfirmPayment={handleConfirmPayment}
      />
    </div>
  );
}
