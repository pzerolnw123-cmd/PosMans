"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
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
  title?: string;
  description?: string;
  confirmLabel?: string;
  busyLabel?: string;
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
  title = "ครอปรูปภาพสินค้า",
  description = "จัดตำแหน่งรูปภาพให้พอดีกับกรอบ แล้วกดยืนยัน",
  confirmLabel = "ยืนยันอัปโหลด",
  busyLabel = "อัปโหลด...",
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

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;

    function handleNativeWheel(event: WheelEvent) {
      event.preventDefault();
      const nextZoom = clamp(zoom + (event.deltaY < 0 ? 0.08 : -0.08), 1, 3);
      onZoomChange(nextZoom);
    }

    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleNativeWheel);
  }, [zoom, onZoomChange]);

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

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] grid place-items-center bg-[var(--modal-backdrop)] p-4 backdrop-blur-[14px]">
      <div className="absolute inset-0 [background:var(--modal-brand-glow)]" />

      <div className="relative z-[1] grid w-[min(92vw,740px)] max-h-[calc(100vh-32px)] min-w-0 gap-6 overflow-y-auto overflow-x-hidden rounded-[24px] border border-[var(--border)] [background:var(--modal-surface)] p-6 shadow-[var(--modal-shadow)] max-[720px]:w-[min(94vw,560px)] max-[520px]:p-4">
        <div className="flex items-start justify-between gap-4 max-[720px]:flex-col max-[720px]:items-stretch">
          <div>
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Image Crop</p>
            <h2 className="mt-2 text-[1.5rem] font-black leading-none tracking-[-0.04em] text-[var(--foreground)]">{title}</h2>
            <p className="mt-3 text-[0.95rem] leading-[1.65] text-[var(--foreground-soft)]">
              {description}
            </p>
          </div>
          <button type="button" className={ghostButtonClass} onClick={onClose} disabled={busy}>
            ออก
          </button>
        </div>

        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] max-[800px]:grid-cols-1">
          {/* Left Column: Image Preview */}
          <div className="grid min-w-0 w-full justify-center gap-4 self-start [--crop-preview-size:min(320px,calc(92vw-80px))] max-[520px]:[--crop-preview-size:min(320px,calc(94vw-64px))]">
            <div
              ref={previewRef}
              className="relative h-[var(--crop-preview-size)] w-[var(--crop-preview-size)] overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--overlay-white-04)] shadow-[var(--shadow-inset-preview)] cursor-grab active:cursor-grabbing"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
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
                  maxWidth: "none",
                  maxHeight: "none",
                  transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
                }}
              />
              <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-inset ring-[var(--overlay-white-08)]" />
            </div>
          </div>

          {/* Right Column: Controls */}
          <div className="grid min-w-0 w-full gap-4 self-start">
            <div className="grid min-w-0 gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--overlay-white-03)] p-5 max-[520px]:p-4">
              <div className="mb-1 min-w-0 border-b border-[var(--border)] pb-4 text-center">
                <span className="text-[0.78rem] font-bold uppercase tracking-widest text-[var(--eyebrow)]">ไฟล์ที่เลือก</span>
                <p className="mt-1 min-w-0 break-all text-[0.92rem] font-semibold text-[var(--foreground)]">{draft.fileName}</p>
              </div>

              <label className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[0.92rem] text-[var(--foreground-soft)]">ซูม</span>
                  <span className="text-[0.88rem] font-bold text-[var(--foreground)]">{zoom.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(event) => onZoomChange(Number(event.target.value))}
                  className="zoom-range"
                  style={{ "--zoom-percent": `${((zoom - 1) / 2) * 100}%` } as CSSProperties}
                />
              </label>

              <div className="grid min-w-0 grid-cols-2 gap-3 text-[0.88rem] text-[var(--foreground-soft)] max-[520px]:grid-cols-1">
                <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-muted)] px-3 py-2">
                  X: {Math.round(offsetX)} px
                </div>
                <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-muted)] px-3 py-2">
                  Y: {Math.round(offsetY)} px
                </div>
              </div>

              <div className="mt-2 grid min-w-0 grid-cols-2 gap-3 border-t border-[var(--border)] pt-4 max-[560px]:grid-cols-1">
                <button type="button" className={`${ghostButtonClass} min-w-0 px-3`} onClick={onClose} disabled={busy}>
                  ยกเลิก
                </button>
                <button type="button" className={`${primaryButtonClass} min-w-0 px-3 text-center leading-tight whitespace-normal`} onClick={onConfirm} disabled={busy}>
                  {busy ? busyLabel : confirmLabel}
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

