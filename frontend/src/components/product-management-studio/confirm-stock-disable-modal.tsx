"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ghostButtonClass, primaryButtonClass } from "@/components/ui-primitives";
import type { ProductItem } from "@/components/product-management-studio/types";

type ConfirmStockDisableModalProps = {
  product: ProductItem;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmStockDisableModal({
  product,
  busy,
  onClose,
  onConfirm,
}: ConfirmStockDisableModalProps) {
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

  return createPortal(
    <div className="fixed inset-0 z-[300] grid place-items-center bg-[var(--modal-backdrop)] p-4 backdrop-blur-[16px]">
      <div className="absolute inset-0 [background:var(--modal-brand-glow)]" />

      <div className="relative z-[1] grid w-[min(94vw,420px)] gap-5 overflow-hidden rounded-none border border-[var(--accent-border)] [background:var(--modal-surface)] p-6 shadow-[var(--modal-shadow)]">
        <div className="grid gap-3">
          <p className="m-0 text-left text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--brand-strong)]">ยืนยันการปิดสต๊อก</p>
          <h2 className="m-0 text-[1.35rem] leading-tight tracking-[-0.04em] text-[var(--foreground)]">สินค้านี้ยังมีสต๊อกคงเหลือ</h2>

          <div className="grid gap-2 rounded-none border border-[var(--border)] bg-[var(--panel-subtle)] p-3">
            <strong className="truncate text-[var(--foreground)]">{product.name || "สินค้าไม่มีชื่อ"}</strong>
            <span className="text-[0.9rem] font-bold text-[var(--foreground-soft)]">
              คงเหลือ {Math.max(0, product.stockQuantity)} ชิ้น
            </span>
          </div>

          <p className="m-0 text-[0.95rem] leading-[1.65] text-[var(--foreground-soft)]">
            ถ้ายืนยันการปิดสต๊อก ระบบจะบันทึกให้สินค้านี้ไม่ตัดสต๊อก และจำนวนคงเหลือจะถูกส่งเป็น 0 เพื่อกันข้อมูลค้างผิดพลาด
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 max-[420px]:grid-cols-1">
          <button type="button" className={ghostButtonClass} onClick={onClose} disabled={busy}>
            กลับไปแก้ไข
          </button>
          <button type="button" className={primaryButtonClass} onClick={onConfirm} disabled={busy}>
            {busy ? "กำลังบันทึก..." : "ยืนยันปิดสต๊อก"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
