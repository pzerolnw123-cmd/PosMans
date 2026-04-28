"use client";

import type { Dispatch, PointerEvent, RefObject, SetStateAction } from "react";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui-primitives";
import type { OwnerPaymentSettingsValue } from "@/components/owner-settings-client";
import type { CompletedSale, PaymentMethod } from "./shared";
import { formatBaht, paymentMethods } from "./shared";
import { QrPaymentInstructions, TransferInstructions } from "./payment-instructions";

type BillItem = {
  key: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  imageUrl: string | null;
};

type PaymentCheckoutPanelsProps = {
  billItems: BillItem[];
  billScrollMetric: { top: number; height: number; visible: boolean };
  billScrollRef: RefObject<HTMLDivElement | null>;
  billSubtotal: number;
  billDiscount: number;
  billTax: number;
  billTotal: number;
  completedSale: CompletedSale | null;
  items: unknown[];
  itemCount: number;
  paymentMethod: PaymentMethod;
  setPaymentMethod: Dispatch<SetStateAction<PaymentMethod>>;
  displayedPaymentMethod: PaymentMethod;
  paymentMethodLabel: string;
  receivedAmount: number;
  setReceivedAmount: Dispatch<SetStateAction<number>>;
  receivedDraft: string | null;
  setReceivedDraft: Dispatch<SetStateAction<string | null>>;
  discountPercent: number;
  setDiscountPercent: Dispatch<SetStateAction<number>>;
  discountDraft: string | null;
  setDiscountDraft: Dispatch<SetStateAction<string | null>>;
  taxPercent: number;
  setTaxPercent: Dispatch<SetStateAction<number>>;
  taxDraft: string | null;
  setTaxDraft: Dispatch<SetStateAction<string | null>>;
  note: string;
  setNote: Dispatch<SetStateAction<string>>;
  error: string;
  busy: boolean;
  discount: number;
  subtotal: number;
  cashPaymentMissingReceivedAmount: boolean;
  qrPaymentConfigured: boolean;
  transferPaymentConfigured: boolean;
  qrPaymentSelected: boolean;
  transferSelected: boolean;
  paymentSettings: OwnerPaymentSettingsValue;
  dynamicPromptPayReady: boolean;
  staticQrReady: boolean;
  promptPayQrDataUrl: string;
  bankInfoFilled: boolean;
  changeAmount: number;
  updateBillScrollbar: () => void;
  handleBillPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handleBillPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  stopBillDrag: (event: PointerEvent<HTMLDivElement>) => void;
  onBackToSales: () => void;
  handleConfirmPayment: () => void;
};

export function PaymentCheckoutPanels({
  billItems, billScrollMetric, billScrollRef, billSubtotal, billDiscount, billTax, billTotal, completedSale, items, itemCount, paymentMethod, setPaymentMethod, displayedPaymentMethod, paymentMethodLabel, receivedAmount, setReceivedAmount, receivedDraft, setReceivedDraft, discountPercent, setDiscountPercent, discountDraft, setDiscountDraft, taxPercent, setTaxPercent, taxDraft, setTaxDraft, note, setNote, error, busy, discount, subtotal, cashPaymentMissingReceivedAmount, qrPaymentConfigured, transferPaymentConfigured, qrPaymentSelected, transferSelected, paymentSettings, dynamicPromptPayReady, staticQrReady, promptPayQrDataUrl, bankInfoFilled, changeAmount, updateBillScrollbar, handleBillPointerDown, handleBillPointerMove, stopBillDrag, onBackToSales, handleConfirmPayment,
}: PaymentCheckoutPanelsProps) {
  return (
    <>
      <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-[16px] rounded-none border border-[var(--border)] bg-[var(--panel-strong)] px-5 py-[18px] shadow-[var(--shadow-soft)] max-[820px]:px-4 max-[820px]:py-4">
        <div>
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Bill Summary</p>
          <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-[var(--foreground)]">
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
                    ? "sales-cart-scroll grid h-full min-h-0 touch-none cursor-grab select-none content-start gap-3 overflow-y-auto overflow-x-hidden py-0 pl-0 pr-4 active:cursor-grabbing"
                    : "grid h-full min-h-0 touch-none select-none content-start gap-3 overflow-hidden py-0 pl-0 pr-0"
                }
                onScroll={updateBillScrollbar}
                onPointerDown={handleBillPointerDown}
                onPointerMove={handleBillPointerMove}
                onPointerUp={stopBillDrag}
                onPointerCancel={stopBillDrag}
                onPointerLeave={stopBillDrag}
              >
                {billItems.map((item) => (
                  <div key={item.key} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 rounded-none border border-[var(--border-subtle)] bg-[var(--panel-subtle)] p-3 max-[520px]:grid-cols-[52px_minmax(0,1fr)]">
                    {item.imageUrl ? (
                      <span className="h-[52px] w-[52px] rounded-[10px] border border-[var(--border-subtle)] bg-cover bg-center" style={{ backgroundImage: `url(${item.imageUrl})` }} />
                    ) : (
                      <div className="h-[52px] w-[52px] rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-muted)]" />
                    )}
                    <div className="grid min-w-0 gap-1">
                      <strong className="truncate text-base leading-[1.2] text-[var(--foreground)]">{item.name}</strong>
                      <span className="text-[0.92rem] text-[var(--foreground-soft)]">
                        {formatBaht(item.unitPrice)} x {item.quantity}
                      </span>
                    </div>
                    <strong className="text-base leading-[1.2] text-[var(--foreground)] max-[520px]:col-span-2 max-[520px]:justify-self-end">{formatBaht(item.lineTotal)}</strong>
                  </div>
                ))}
              </div>
              {billScrollMetric.visible ? (
                <span className="pointer-events-none absolute bottom-0 right-0 top-0 w-[7px] rounded-full bg-[var(--scroll-track)]">
                  <span
                    className="absolute left-0 w-full rounded-full [background:var(--scroll-thumb)] shadow-[var(--brand-shadow)_0_0_14px]"
                    style={{ top: `${billScrollMetric.top}%`, height: `${billScrollMetric.height}%` }}
                  />
                </span>
              ) : null}
            </>
          ) : (
            <div className="grid min-h-[220px] place-items-center rounded-none border border-dashed border-[var(--border-soft)] text-center text-[var(--foreground-soft)]">
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
            <div key={label} className="flex items-center justify-between gap-3 max-[420px]:flex-col max-[420px]:items-start">
              <span className="text-[0.95rem] text-[var(--foreground-soft)]">{label}</span>
              <strong className="text-base leading-[1.2] text-[var(--foreground)]">{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="grid h-fit content-start gap-[16px] rounded-none border border-[var(--border)] bg-[var(--panel-strong)] px-5 py-[18px] shadow-[var(--shadow-soft)] max-[820px]:px-4 max-[820px]:py-4">
        <div>
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Payment Methods</p>
          <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-[var(--foreground)]">{completedSale ? "วิธีชำระล่าสุด" : "เลือกวิธีชำระ"}</strong>
          <p className="m-0 text-[0.95rem] leading-[1.65] text-[var(--foreground-soft)]">
            {completedSale ? "บิลนี้ชำระสำเร็จแล้ว รายละเอียดถูกล็อกไว้" : "เลือกวิธีรับเงินก่อนบันทึกบิลจริง"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
          {paymentMethods.map((method) => (
            <button
              key={method.value}
              type="button"
              className={`${secondaryButtonClass} min-h-[52px] rounded-2xl`}
              style={
                displayedPaymentMethod === method.value
                  ? {
                      backgroundColor: "color-mix(in srgb, var(--surface-muted) 82%, var(--foreground) 8%)",
                      opacity: 1,
                    }
                  : undefined
              }
              onClick={() => setPaymentMethod(method.value)}
              disabled={Boolean(completedSale) || method.value === "CARD"}
              aria-disabled={method.value === "CARD"}
            >
              {method.label}
            </button>
          ))}
        </div>

        <div className="grid content-start gap-4">
          <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
            {paymentMethod === "CASH" && !completedSale && (
              <label className="grid gap-2">
                <span className="text-[0.92rem] font-bold text-[var(--brand-strong)]">รับเงินมา</span>
                <input
                  className={`${inputClass} border-[var(--accent-border)] text-[1.2rem] font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  type="number"
                  min={0}
                  value={receivedDraft ?? (receivedAmount === 0 ? "" : String(receivedAmount))}
                  placeholder="ยอดเงิน..."
                  onChange={(event) => {
                    const val = event.target.value;
                    setReceivedDraft(val);
                    const parsed = Number(val);
                    if (!isNaN(parsed)) setReceivedAmount(Math.max(0, parsed));
                  }}
                  onBlur={() => setReceivedDraft(null)}
                  autoFocus
                />
              </label>
            )}
            <label className={`grid gap-2 ${paymentMethod !== "CASH" || completedSale ? "col-span-2" : ""}`}>
              <span className="flex items-center gap-2 text-[0.92rem] text-[var(--foreground-soft)]">
                ส่วนลด <span className="rounded-[4px] bg-[var(--success-bright)]/10 px-1.5 py-0.5 text-[0.72rem] font-bold text-[var(--success-bright)]">%</span>
              </span>
              <input
                className={`${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                type="number"
                min={0}
                max={100}
                value={discountDraft ?? String(discountPercent)}
                placeholder="0"
                onChange={(event) => {
                  const val = event.target.value;
                  setDiscountDraft(val);
                  const parsed = Number(val);
                  if (!isNaN(parsed)) setDiscountPercent(Math.max(0, Math.min(100, parsed)));
                }}
                onBlur={() => setDiscountDraft(null)}
                disabled={Boolean(completedSale)}
              />
            </label>
          </div>
          <label className="grid gap-2 max-[640px]:gap-1.5">
            <span className="flex items-center gap-2 text-[0.92rem] text-[var(--foreground-soft)]">
              ภาษี <span className="rounded-[4px] bg-[var(--danger-bright)]/10 px-1.5 py-0.5 text-[0.72rem] font-bold text-[var(--danger-bright)]">%</span>
            </span>
            <input
              className={`${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              type="number"
              min={0}
              max={100}
              value={taxDraft ?? String(taxPercent)}
              placeholder="0"
              onChange={(event) => {
                const val = event.target.value;
                setTaxDraft(val);
                const parsed = Number(val);
                if (!isNaN(parsed)) setTaxPercent(Math.max(0, parsed));
              }}
              onBlur={() => setTaxDraft(null)}
              disabled={Boolean(completedSale)}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-[0.92rem] text-[var(--foreground-soft)]">หมายเหตุบิล</span>
            <textarea
              className="min-h-[116px] rounded-none border border-[var(--border-field)] bg-[var(--field-bg)] px-[14px] py-3 text-[var(--foreground)] outline-none transition placeholder:text-[var(--field-placeholder)] focus:border-[var(--brand-strong)] focus:shadow-[inset_0_0_0_1px_var(--ring)] disabled:cursor-not-allowed disabled:opacity-70 flex-shrink-0 resize-none max-[640px]:min-h-[96px] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-[var(--scroll-track)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:[background:var(--scroll-thumb)] hover:[&::-webkit-scrollbar-thumb]:[background:var(--scroll-thumb-hover)]"
              value={completedSale ? completedSale.note || "" : note}
              onChange={(event) => setNote(event.target.value)}
              disabled={Boolean(completedSale)}
            />
          </label>
          {error ? <div className="rounded-none border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-[0.86rem] font-bold text-[var(--danger-bright)]">{error}</div> : null}
        </div>

        <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
          <button type="button" className={`${secondaryButtonClass} min-h-[52px] rounded-2xl`} onClick={onBackToSales}>
            {completedSale ? "เปิดออเดอร์ใหม่" : "กลับไปขาย"}
          </button>
          <button
            type="button"
            className={`${primaryButtonClass} min-h-[52px] rounded-2xl`}
            disabled={items.length === 0 || busy || discount > subtotal || Boolean(completedSale) || cashPaymentMissingReceivedAmount || (paymentMethod === "QR" && !qrPaymentConfigured) || (paymentMethod === "TRANSFER" && !transferPaymentConfigured)}
            onClick={handleConfirmPayment}
          >
            {busy ? "กำลังยืนยัน..." : "ยืนยันการชำระ"}
          </button>
        </div>
      </section>

      <section className="grid h-fit gap-[16px] rounded-none border border-[var(--border)] bg-[var(--panel-strong)] px-5 py-[18px] shadow-[var(--shadow-soft)] max-[1366px]:col-span-2 max-[1180px]:col-span-1 max-[820px]:px-4 max-[820px]:py-4">
        <div>
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Quick Panel</p>
          <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-[var(--foreground)]">สถานะชำระเงิน</strong>
        </div>
        <div className="grid gap-2">
          {!completedSale && qrPaymentSelected ? (
            <QrPaymentInstructions
              compact
              qrPaymentSelected={qrPaymentSelected}
              completedSale={Boolean(completedSale)}
              billTotal={billTotal}
              paymentSettings={paymentSettings}
              dynamicPromptPayReady={dynamicPromptPayReady}
              staticQrReady={staticQrReady}
              promptPayQrDataUrl={promptPayQrDataUrl}
            />
          ) : !completedSale && transferSelected ? (
            <TransferInstructions
              compact
              transferSelected={transferSelected}
              completedSale={Boolean(completedSale)}
              billTotal={billTotal}
              paymentSettings={paymentSettings}
              bankInfoFilled={bankInfoFilled}
            />
          ) : (
            <>
              {completedSale ? (
                <div className="rounded-none border border-[var(--success-border)] bg-[var(--success-wash)] px-3.5 py-3">
                  <span className="text-[0.82rem] text-[var(--foreground-soft)]">วิธีชำระเงิน</span>
                  <strong className="mt-1 block text-[1.05rem] leading-[1.1] text-[var(--success)]">{paymentMethodLabel}</strong>
                </div>
              ) : null}
              {paymentMethod === "CASH" && !completedSale && receivedAmount > 0 && (
                <div className="rounded-none border border-[var(--accent-border)] bg-[var(--accent-surface)] px-3.5 py-3 shadow-[var(--brand-shadow)_0_0_15px]">
                  <span className="text-[0.82rem] text-[var(--brand-strong)]">เงินทอน</span>
                  <strong className="mt-1 block text-[1.05rem] leading-[1.1] text-[var(--foreground)]">{formatBaht(changeAmount)}</strong>
                </div>
              )}
              <div className="rounded-none border border-[var(--border-subtle)] bg-[var(--panel-subtle)] px-3.5 py-3">
                <span className="text-[0.82rem] text-[var(--foreground-soft)]">จำนวนรายการ</span>
                <strong className="mt-1 block text-[1.05rem] leading-[1.1] text-[var(--foreground)]">
                  {billItems.length} รายการ / {itemCount} ชิ้น
                </strong>
              </div>
              <div className="rounded-none border border-[var(--border-subtle)] bg-[var(--panel-subtle)] px-3.5 py-3">
                <span className="text-[0.82rem] text-[var(--foreground-soft)]">ยอดสุทธิ</span>
                <strong className="mt-1 block text-[1.05rem] leading-[1.1] text-[var(--foreground)]">{formatBaht(billTotal)}</strong>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
