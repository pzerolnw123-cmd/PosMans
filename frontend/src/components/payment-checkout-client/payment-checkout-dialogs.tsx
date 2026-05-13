"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui-primitives";
import type { PaymentMethod } from "./shared";
import { formatBaht } from "./shared";

export function CustomerDisplayControl({
  displayUrl,
  busy,
  onOpen,
}: {
  displayUrl: string;
  busy: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="grid min-w-0 gap-2 rounded-none border border-[var(--border-subtle)] bg-[var(--panel-subtle)] p-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:min-h-[74px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:min-h-[74px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:p-2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:p-2">
      <div className="grid gap-2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-1 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-1">
        <div className="min-w-0 [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)]:[&_strong]:hidden [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:[&_strong]:hidden [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[&_strong]:hidden">
          <span className="block whitespace-nowrap text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--eyebrow)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.68rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.68rem]">Customer Display</span>
          <strong className="mt-1 block text-[0.98rem] leading-tight text-[var(--foreground)]">จอลูกค้า</strong>
        </div>
        <button type="button" className={`${secondaryButtonClass} min-h-[38px] w-full rounded-xl px-3 text-[0.86rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:min-h-[32px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:min-h-[32px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:px-2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:px-2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.8rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.8rem]`} onClick={onOpen} disabled={busy}>
          {busy ? "กำลังเปิด..." : displayUrl ? "เปิดอีกครั้ง" : "เปิดจอ"}
        </button>
      </div>
    </div>
  );
}

export function ConfirmPaymentModal({
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
