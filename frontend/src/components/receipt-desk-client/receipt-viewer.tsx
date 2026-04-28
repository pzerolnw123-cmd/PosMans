import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Loader, primaryButtonClass, secondaryButtonClass } from "@/components/ui-primitives";
import type { Receipt } from "./shared";
import { createReceiptPdfBlob, formatBaht, formatDateTime, paymentMethodLabels } from "./shared";

export type ReceiptViewerProps = {
  receipt: Receipt | null;
  detailLoading: boolean;
  actionMessage: string;
  setActionMessage: (msg: string) => void;
};

export function ReceiptViewer({ receipt, detailLoading, actionMessage, setActionMessage }: ReceiptViewerProps) {
  const [receiptScrollMetric, setReceiptScrollMetric] = useState({ top: 0, height: 100, visible: false });
  const receiptScrollRef = useRef<HTMLDivElement | null>(null);
  const receiptDragRef = useRef({
    active: false,
    pointerId: 0,
    startY: 0,
    scrollTop: 0,
  });

  const selectedItemCount = useMemo(
    () => receipt?.items.reduce((total, item) => total + item.quantity, 0) || 0,
    [receipt]
  );

  function updateReceiptScrollbar() {
    const node = receiptScrollRef.current;
    if (!node) {
      return;
    }

    const maxScroll = node.scrollHeight - node.clientHeight;
    if (maxScroll <= 0) {
      setReceiptScrollMetric({ top: 0, height: 100, visible: false });
      return;
    }

    const height = Math.max(14, (node.clientHeight / node.scrollHeight) * 100);
    const top = (node.scrollTop / maxScroll) * (100 - height);
    setReceiptScrollMetric({ top, height, visible: true });
  }

  useLayoutEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      updateReceiptScrollbar();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [receipt?.id, receipt?.items.length]);

  function handleReceiptPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    const target = event.currentTarget;
    receiptDragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startY: event.clientY,
      scrollTop: target.scrollTop,
    };
    target.setPointerCapture(event.pointerId);
    target.dataset.dragging = "true";
  }

  function handleReceiptPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = receiptDragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
    updateReceiptScrollbar();
  }

  function stopReceiptDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = receiptDragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) {
      return;
    }

    receiptDragRef.current.active = false;
    event.currentTarget.dataset.dragging = "false";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function handlePrint() {
    if (!receipt) return;

    const popupWidth = Math.max(960, window.screen.availWidth || window.innerWidth);
    const popupHeight = Math.max(720, window.screen.availHeight || window.innerHeight);
    const pdfWindow = window.open("", "_blank", `left=0,top=0,width=${popupWidth},height=${popupHeight}`);
    if (!pdfWindow) {
      setActionMessage("เบราว์เซอร์บล็อกหน้าต่าง PDF กรุณาอนุญาต pop-up สำหรับหน้านี้");
      return;
    }

    pdfWindow.moveTo(0, 0);
    pdfWindow.resizeTo(popupWidth, popupHeight);
    pdfWindow.document.open();
    pdfWindow.document.write("<!doctype html><title>กำลังสร้าง PDF</title><body style=\"font-family:Arial,sans-serif;margin:24px\">กำลังสร้าง PDF ใบเสร็จ...</body>");
    pdfWindow.document.close();

    try {
      const pdfBlob = await createReceiptPdfBlob(receipt);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      pdfWindow.location.href = `${pdfUrl}#zoom=page-width`;
      setActionMessage("");
      pdfWindow.addEventListener("pagehide", () => URL.revokeObjectURL(pdfUrl), { once: true });
    } catch (printError) {
      pdfWindow.close();
      setActionMessage(printError instanceof Error ? printError.message : "สร้าง PDF ไม่สำเร็จ กรุณาลองอีกครั้ง");
    }
  }

  async function handleCopy() {
    if (!receipt) return;

    const text = [
      `${receipt.store?.name || "Menu Store"} - ${receipt.code}`,
      `เวลา: ${formatDateTime(receipt.createdAt)}`,
      `วิธีชำระ: ${paymentMethodLabels[receipt.paymentMethod]}`,
      ...receipt.items.map((item) => `- ${item.name} x ${item.quantity}: ${formatBaht(item.lineTotal)}`),
      `รวมสุทธิ: ${formatBaht(receipt.total)}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setActionMessage("คัดลอกข้อมูลใบเสร็จแล้ว");
    } catch {
      setActionMessage("คัดลอกไม่สำเร็จ กรุณาลองอีกครั้ง");
    }
  }

  return (
    <section className="grid h-fit min-h-0 content-start gap-[18px] rounded-none border border-[var(--border)] bg-[var(--panel-strong)] px-5 py-[18px] shadow-[var(--shadow-soft)] max-[820px]:px-4 max-[820px]:py-4">
      <div>
        <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Print & Share</p>
        <strong className="my-[10px] block text-[clamp(1.65rem,2.7vw,2.2rem)] leading-none tracking-[-0.06em] text-[var(--foreground)]">งานหลังปิดบิล</strong>
        <p className="m-0 text-[0.95rem] text-[var(--foreground-soft)]">พิมพ์ซ้ำและส่งรายละเอียดจากบิลที่เลือก</p>
      </div>

      {receipt ? (
        <>
          <div className="relative mx-auto grid max-h-[min(520px,calc(100vh-320x))] min-h-0 w-full max-w-[320px] grid-rows-[auto_minmax(0,1fr)_auto] gap-3 overflow-hidden rounded-none border border-[var(--border-subtle)] bg-[var(--field-bg)] px-5 py-4 max-[520px]:max-w-none max-[520px]:px-4">
            <div className="text-center">
              <p className="m-0 text-[0.6rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Receipt Preview</p>
              <strong className="mt-3 block truncate whitespace-nowrap text-[0.85rem] leading-[1.2] text-[var(--foreground)]">{receipt.code}</strong>
              <p className="mt-2 text-[0.7rem] text-[var(--foreground-soft)]">{receipt.store?.name || "Menu Store"}</p>
              <p className="mt-1 text-[0.78rem] text-[var(--foreground-soft)]">{formatDateTime(receipt.createdAt)}</p>
            </div>

            <div className="relative max-h-[180px] min-h-0 border-y border-y-[var(--border-subtle)] py-3">
              <div
                ref={receiptScrollRef}
                className={
                  receiptScrollMetric.visible
                    ? "sales-cart-scroll grid h-full min-h-0 touch-none cursor-grab select-none content-start gap-2 overflow-y-auto overflow-x-hidden py-0 pl-0 pr-4 active:cursor-grabbing"
                    : "grid h-full min-h-0 touch-none select-none content-start gap-2 overflow-hidden py-0 pl-0 pr-0"
                }
                onScroll={updateReceiptScrollbar}
                onPointerDown={handleReceiptPointerDown}
                onPointerMove={handleReceiptPointerMove}
                onPointerUp={stopReceiptDrag}
                onPointerCancel={stopReceiptDrag}
                onPointerLeave={stopReceiptDrag}
              >
                {receipt.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-[0.84rem]">
                    <span className="truncate text-[var(--foreground-soft)]">{item.name} x {item.quantity}</span>
                    <strong className="text-[var(--foreground)]">{formatBaht(item.lineTotal)}</strong>
                  </div>
                ))}
              </div>
              {receiptScrollMetric.visible ? (
                <span className="pointer-events-none absolute bottom-3 right-0 top-3 w-[7px] rounded-full bg-[var(--scroll-track)]">
                  <span
                    className="absolute left-0 w-full rounded-full [background:var(--scroll-thumb)] shadow-[var(--brand-shadow)_0_0_14px]"
                    style={{ top: `${receiptScrollMetric.top}%`, height: `${receiptScrollMetric.height}%` }}
                  />
                </span>
              ) : null}
            </div>

            <div className="grid gap-2 text-[0.86rem]">
              <div className="flex justify-between gap-3 max-[420px]:flex-col max-[420px]:items-start"><span className="text-[var(--foreground-soft)]">Subtotal</span><strong className="text-[var(--foreground)]">{formatBaht(receipt.subtotal)}</strong></div>
              <div className="flex justify-between gap-3 max-[420px]:flex-col max-[420px]:items-start"><span className="text-[var(--foreground-soft)]">Discount</span><strong className="text-[var(--foreground)]">{formatBaht(receipt.discount)}</strong></div>
              <div className="flex justify-between gap-3 max-[420px]:flex-col max-[420px]:items-start"><span className="text-[var(--foreground-soft)]">Tax</span><strong className="text-[var(--foreground)]">{formatBaht(receipt.tax)}</strong></div>
              <div className="flex justify-between gap-3 border-t border-t-[var(--border-subtle)] pt-2 text-[1rem] max-[420px]:flex-col max-[420px]:items-start"><span className="text-[var(--foreground)]">สุทธิ</span><strong className="text-[var(--foreground)]">{formatBaht(receipt.total)}</strong></div>
            </div>
            {detailLoading ? (
              <div className="absolute inset-0 z-20 grid place-items-center bg-[color:color-mix(in_srgb,var(--field-bg)_82%,transparent)] backdrop-blur-[1px]">
                <Loader size={42} label="กำลังโหลดรายละเอียด" />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
            <button type="button" className={primaryButtonClass} onClick={handlePrint} disabled={detailLoading}>
              พิมพ์ PDF
            </button>
            <button type="button" className={secondaryButtonClass} onClick={handleCopy} disabled={detailLoading}>
              คัดลอก
            </button>
          </div>

          <div className="grid gap-2 rounded-none border border-[var(--border-subtle)] bg-[var(--panel-subtle)] px-3.5 py-3 text-[0.86rem]">
            <div className="flex justify-between gap-3"><span className="text-[var(--foreground-soft)]">วิธีชำระ</span><strong className="text-[var(--foreground)]">{paymentMethodLabels[receipt.paymentMethod]}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-[var(--foreground-soft)]">จำนวนสินค้า</span><strong className="text-[var(--foreground)]">{selectedItemCount} ชิ้น</strong></div>
          </div>
        </>
      ) : (
        <div className="grid min-h-[320px] place-items-center rounded-none border border-dashed border-[var(--border)] text-center text-[var(--foreground-soft)]">
          เลือกใบเสร็จเพื่อดูตัวอย่าง
        </div>
      )}

      {actionMessage ? <div className="rounded-none border border-[var(--accent-border)] bg-[var(--accent-surface)] px-3 py-2 text-[0.86rem] text-[var(--accent-text)]">{actionMessage}</div> : null}
    </section>
  );
}
