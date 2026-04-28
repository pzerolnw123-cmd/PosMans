"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { dangerButtonClass, ghostButtonClass } from "@/components/ui-primitives";
import type { ProductItem } from "@/components/product-management-studio/types";

type ConfirmDeleteModalProps = {
  product: ProductItem;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteModal({
  product,
  busy,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
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
      <div className="absolute inset-0 [background:var(--modal-danger-glow)]" />

      <div className="relative z-[1] grid w-[min(94vw,400px)] gap-6 overflow-hidden rounded-none border border-[var(--danger-border)] [background:var(--modal-surface)] p-6 shadow-[var(--modal-shadow)]">
        <div className="grid gap-2">
          <p className="m-0 text-left text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--danger)]">ยืนยันการลบ</p>
          <h2 className="mt-2 text-center text-[1.4rem] leading-tight tracking-[-0.04em] text-[var(--foreground-inverse)]">ต้องการลบสินค้าชิ้นนี้ใช่หรือไม่?</h2>
          <div className="mx-auto mt-4 flex w-fit items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--overlay-white-02)] p-3 pr-8 text-left">
             {product.imageUrl ? (
               // eslint-disable-next-line @next/next/no-img-element
               <img src={product.imageUrl} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
             ) : (
               <div className="h-12 w-12 rounded-lg bg-[var(--overlay-white-06)]" />
             )}
             <div className="min-w-0">
               <strong className="block truncate text-[var(--foreground-inverse)]">{product.name}</strong>
               <small className="block text-[var(--foreground-soft)]">{product.code}</small>
             </div>
          </div>
          <p className="mt-4 text-center text-[0.95rem] leading-[1.6] text-[var(--foreground-soft)]">
            การดำเนินการนี้ไม่สามารถย้อนกลับได้ <br /> ข้อมูลสินค้าจะถูกลบออกจากระบบทันที
          </p>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <button type="button" className={`${ghostButtonClass} min-w-[120px]`} onClick={onClose} disabled={busy}>
            ยกเลิก
          </button>
          <button type="button" className={`${dangerButtonClass} min-w-[120px]`} onClick={onConfirm} disabled={busy}>
            {busy ? "กำลังลบ..." : "ยืนยันการลบ"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

