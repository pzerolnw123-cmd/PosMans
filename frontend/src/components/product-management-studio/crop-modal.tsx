"use client";

import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ghostButtonClass, primaryButtonClass } from "@/components/ui-primitives";
import { buildCropMetrics, clamp, CROP_VIEWPORT_SIZE } from "@/components/product-management-studio/lib";
import type { CropDraft } from "@/components/product-management-studio/types";

type CropModalProps = {
  draft: CropDraft;
  zoom: number;
  offsetX: number;
  offsetY: number;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onZoomChange: (value: number) => void;
  onOffsetChange: (x: number, y: number) => void;
};

export function CropModal({
  draft,
  zoom,
  offsetX,
  offsetY,
  busy,
  onClose,
  onConfirm,
  onZoomChange,
  onOffsetChange,
}: CropModalProps) {
  const dragState = useRef<{ startX: number; startY: number } | null>(null);
  const cropMetrics = useMemo(() => buildCropMetrics(draft.image, zoom, CROP_VIEWPORT_SIZE), [draft.image, zoom]);
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

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    dragState.current = { startX: event.clientX, startY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState.current) {
      return;
    }

    const deltaX = event.clientX - dragState.current.startX;
    const deltaY = event.clientY - dragState.current.startY;
    dragState.current = { startX: event.clientX, startY: event.clientY };
    onOffsetChange(offsetX + deltaX, offsetY + deltaY);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    dragState.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const nextZoom = clamp(zoom + (event.deltaY < 0 ? 0.08 : -0.08), 1, 3);
    onZoomChange(nextZoom);
  }

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] grid place-items-center bg-[rgba(7,10,16,0.5)] p-4 backdrop-blur-[14px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(108,92,231,0.12),transparent_40%)]" />

      <div className="relative z-[1] grid w-[min(92vw,740px)] max-h-[calc(100vh-32px)] gap-6 overflow-y-auto rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(22,27,38,0.98),rgba(15,19,28,0.96))] p-6 shadow-[rgba(0,0,0,0.46)_0_30px_80px] max-[720px]:w-[min(94vw,560px)]">
        <div className="flex items-start justify-between gap-4 max-[720px]:flex-col max-[720px]:items-stretch">
          <div>
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Image Crop</p>
            <h2 className="mt-2 text-[1.5rem] leading-none tracking-[-0.04em] text-white">ครอปรูปภาพสินค้า</h2>
            <p className="mt-3 text-[0.95rem] leading-[1.65] text-[var(--foreground-soft)]">
              ลากภาพเพื่อจัดตำแหน่ง และใช้ตัวเลื่อนเพื่อซูมก่อนอัปโหลดขึ้น R2
            </p>
          </div>
          <button type="button" className={ghostButtonClass} onClick={onClose} disabled={busy}>
            ออก
          </button>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)] max-[800px]:grid-cols-1">
          {/* Left Column: Image Preview */}
          <div className="grid gap-4 self-start justify-center w-full">
            <div
              className="relative aspect-square w-[320px] overflow-hidden rounded-[24px] border border-[rgba(100,120,160,0.18)] bg-[rgba(255,255,255,0.04)] shadow-[rgba(0,0,0,0.25)_0_10px_24px_inset] cursor-grab active:cursor-grabbing"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={draft.objectUrl}
                alt="Crop preview"
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  width: cropMetrics.renderWidth,
                  height: cropMetrics.renderHeight,
                  transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
                }}
              />
              <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-inset ring-[rgba(255,255,255,0.08)]" />
            </div>
          </div>

          {/* Right Column: Controls */}
          <div className="grid gap-4 self-start w-full">
            <div className="grid gap-3 rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-5">
              <div className="mb-1 pb-4 border-b border-[var(--border)] text-center">
                <span className="text-[0.78rem] font-bold uppercase tracking-widest text-[#6b7a94]">ไฟล์ที่เลือก</span>
                <p className="mt-1 break-words text-[0.92rem] text-white opacity-90">{draft.fileName}</p>
              </div>

              <label className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[0.92rem] text-[var(--foreground-soft)]">ซูม</span>
                  <span className="text-[0.88rem] font-medium text-white">{zoom.toFixed(2)}x</span>
                </div>
                <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => onZoomChange(Number(event.target.value))} />
              </label>

              <div className="grid grid-cols-2 gap-3 text-[0.88rem] text-[var(--foreground-soft)]">
                <div className="rounded-xl border border-[rgba(100,120,160,0.12)] bg-[rgba(22,27,38,0.56)] px-3 py-2">
                  X: {Math.round(offsetX)} px
                </div>
                <div className="rounded-xl border border-[rgba(100,120,160,0.12)] bg-[rgba(22,27,38,0.56)] px-3 py-2">
                  Y: {Math.round(offsetY)} px
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-4">
                <button type="button" className={ghostButtonClass} onClick={onClose} disabled={busy}>
                  ยกเลิก
                </button>
                <button type="button" className={primaryButtonClass} onClick={onConfirm} disabled={busy}>
                  {busy ? "อัปโหลด..." : "ยืนยันอัปโหลด"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
