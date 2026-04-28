"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { ConfirmPaymentSettingsModalProps } from "./shared";
import { activeGhostButtonClass, primaryButtonClass } from "./shared";

export function ConfirmPaymentSettingsModal({ busy, enabled, recipientLabel, bankSummary, promptPaySummary, onClose, onConfirm }: ConfirmPaymentSettingsModalProps) {
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

      <div className="relative z-[1] grid w-[calc(100vw-32px)] max-w-[380px] gap-5 overflow-hidden rounded-none border border-[var(--border)] [background:var(--modal-surface)] p-5 shadow-[var(--modal-shadow)] max-[640px]:gap-4 max-[640px]:p-4">
        <div className="grid gap-3">
          <p className="m-0 text-left text-[0.7rem] font-bold uppercase tracking-[0.28em] text-[var(--brand-strong)]">ยืนยันการบันทึก</p>
          <h2 className="m-0 text-[1.25rem] leading-tight tracking-[-0.04em] text-[var(--foreground)]">ต้องการบันทึกการตั้งค่านี้ใช่ไหม</h2>
          <div className="inline-grid w-full gap-2 rounded-none border border-[var(--border)] bg-[var(--panel-subtle)] p-3">
            <div className="grid gap-1">
              <span className="text-[0.78rem] text-[var(--foreground-soft)]">{enabled ? "ประเภทผู้รับเงิน" : "สถานะระบบ"}</span>
              <strong className="text-[var(--foreground)] text-[0.95rem]">{enabled ? recipientLabel : "ปิดใช้งานและซ่อนจากหน้าร้าน (Offline)"}</strong>
            </div>
            {promptPaySummary ? (
              <div className="grid gap-1 border-t border-[var(--border-subtle)] pt-2">
                <span className="text-[0.78rem] text-[var(--foreground-soft)]">PromptPay {!enabled ? <span className="text-[var(--accent-text)]">(บันทึกแบบรอเปิดใช้)</span> : null}</span>
                <div className={`text-[0.95rem] ${enabled ? "text-[var(--foreground)]" : "text-[var(--foreground-soft)]"}`}>{promptPaySummary}</div>
              </div>
            ) : null}
            {bankSummary ? (
              <div className="grid gap-1 border-t border-[var(--border-subtle)] pt-2">
                <span className="text-[0.78rem] text-[var(--foreground-soft)]">บัญชีธนาคาร {!enabled ? <span className="text-[var(--accent-text)]">(บันทึกแบบรอเปิดใช้)</span> : null}</span>
                <div className={`text-[0.95rem] ${enabled ? "text-[var(--foreground)]" : "text-[var(--foreground-soft)]"}`}>{bankSummary}</div>
              </div>
            ) : null}
          </div>
          <p className="m-0 text-[0.88rem] leading-[1.6] text-[var(--foreground-soft)]">
            {enabled ? (
              <>
                หลังบันทึกแล้ว หน้า Payment จะใช้ข้อมูลนี้ <br />
                เป็นค่าแสดงผลล่าสุดของร้าน
              </>
            ) : (
              "ข้อมูลจะถูกบันทึกเตรียมไว้ แต่หน้า Payment จะไม่แสดงข้อมูลรับเงิน จนกว่าคุณจะกดเปิดสวิตช์ใช้งาน"
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 max-[520px]:grid-cols-1">
          <button type="button" className={`${activeGhostButtonClass} py-2.5 text-[0.92rem]`} onClick={onClose} disabled={busy}>
            ยกเลิก
          </button>
          <button type="button" className={`${primaryButtonClass} py-2.5 text-[0.92rem]`} onClick={onConfirm} disabled={busy}>
            {busy ? "กำลังบันทึก..." : "ยืนยันการบันทึก"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

