"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useBackofficeShellAlert } from "@/components/backoffice-shell";
import { CropModal } from "@/components/product-management-studio/crop-modal";
import {
  clampOffset,
  createCroppedBlob,
  createImageObjectUrl,
  CROP_VIEWPORT_SIZE,
  loadImage,
  requestSignedUpload,
  uploadBlobToR2,
} from "@/components/product-management-studio/lib";
import type { CropDraft } from "@/components/product-management-studio/types";
import { ensureCsrfToken } from "@/lib/csrf";
import type { OwnerLogoContextValue } from "./shared";
import {
  logoFileTypes,
  maxLogoFileSize,
  primaryButtonClass,
  readApiMessage,
  readBlobAsDataUrl,
} from "./shared";

// ── Logo Context ─────────────────────────────────────────────────────────────

const OwnerLogoContext = createContext<OwnerLogoContextValue | null>(null);

function useOwnerLogo() {
  const context = useContext(OwnerLogoContext);

  if (!context) {
    throw new Error("useOwnerLogo must be used inside OwnerLogoProvider");
  }

  return context;
}

// ── OwnerLogoProvider ────────────────────────────────────────────────────────

export function OwnerLogoProvider({ children, initialLogoUrl = "" }: { children: ReactNode; initialLogoUrl?: string | null }) {
  const normalizedInitialLogoUrl = initialLogoUrl || "";
  const [previewUrl, setPreviewUrl] = useState(normalizedInitialLogoUrl);
  const [saved, setSaved] = useState(Boolean(normalizedInitialLogoUrl));

  useEffect(() => {
    setPreviewUrl(normalizedInitialLogoUrl);
    setSaved(Boolean(normalizedInitialLogoUrl));
  }, [normalizedInitialLogoUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function setSavedLogo(url: string) {
    setPreviewUrl(url);
    setSaved(true);
  }

  return (
    <OwnerLogoContext.Provider value={{ previewUrl, setPreviewUrl, saved, setSaved, setSavedLogo }}>
      {children}
    </OwnerLogoContext.Provider>
  );
}

// ── SelectedLogoStatus ───────────────────────────────────────────────────────

function SelectedLogoStatus({ saved }: { saved: boolean }) {
  return (
    <p className="inline-flex items-center gap-2 text-[0.86rem] leading-[1.5] text-[var(--foreground-soft)]">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className="opacity-80 text-[var(--success)]" aria-hidden="true">
        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="m7 12l3.488 3.837a.2.2 0 0 0 .296 0L17 9" />
      </svg>
      {saved ? "คุณมีรูปภาพโลโก้แล้ว" : "เลือกรูปภาพแล้ว"}
    </p>
  );
}

// ── OwnerLogoStatusPill ──────────────────────────────────────────────────────

export function OwnerLogoStatusPill() {
  const { previewUrl, saved } = useOwnerLogo();

  if (!previewUrl) {
    return null;
  }

  return <SelectedLogoStatus saved={saved} />;
}

// ── OwnerLogoStatusPreview ───────────────────────────────────────────────────

export function OwnerLogoStatusPreview() {
  const { previewUrl } = useOwnerLogo();

  if (previewUrl) {
    return (
      <div className="grid aspect-square min-h-[206px] place-items-center overflow-hidden">
        <span
          className="h-[74%] w-[74%] bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${previewUrl})` }}
          role="img"
          aria-label="โลโก้ร้าน"
        />
      </div>
    );
  }

  return (
    <div className="grid aspect-square min-h-[206px] place-items-center overflow-hidden rounded-[14px] border border-dashed border-[rgba(100,120,160,0.32)] bg-[var(--field-bg)]">
      <span className="text-[0.95rem] font-semibold text-[var(--foreground-soft)]">โลโก้ร้าน</span>
    </div>
  );
}

// ── OwnerLogoClient ──────────────────────────────────────────────────────────

export function OwnerLogoClient({ compact = false }: { compact?: boolean }) {
  const { setShellAlert } = useBackofficeShellAlert();
  const router = useRouter();
  const { previewUrl, setPreviewUrl, saved, setSaved, setSavedLogo } = useOwnerLogo();
  const [fileName, setFileName] = useState("");
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropBusy, setCropBusy] = useState(false);
  const [pendingLogoBlob, setPendingLogoBlob] = useState<Blob | null>(null);

  useEffect(() => {
    return () => {
      if (cropDraft?.objectUrl) {
        URL.revokeObjectURL(cropDraft.objectUrl);
      }
    };
  }, [cropDraft]);

  function showLogoAlert(message: string) {
    setShellAlert({ message, tone: "danger" });
  }

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!logoFileTypes.has(file.type)) {
      showLogoAlert("รองรับไฟล์ PNG, JPG หรือ WebP");
      event.target.value = "";
      return;
    }

    if (file.size > maxLogoFileSize) {
      showLogoAlert("ไฟล์โลโก้ต้องไม่เกิน 2 MB");
      event.target.value = "";
      return;
    }

    let objectUrl = "";

    try {
      objectUrl = createImageObjectUrl(file);
      const image = await loadImage(objectUrl);
      setCropDraft({ fileName: file.name, objectUrl, image });
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
    } catch (error) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      showLogoAlert(error instanceof Error ? error.message : "ไม่สามารถเตรียมรูปภาพสำหรับคร็อบได้");
    }
  }

  function handleCropZoomChange(nextZoom: number) {
    if (!cropDraft) {
      return;
    }

    setCropOffset((current) => clampOffset(cropDraft.image, nextZoom, current.x, current.y, CROP_VIEWPORT_SIZE));
    setCropZoom(nextZoom);
  }

  function handleCropOffsetChange(nextX: number, nextY: number) {
    if (!cropDraft) {
      return;
    }

    setCropOffset(clampOffset(cropDraft.image, cropZoom, nextX, nextY, CROP_VIEWPORT_SIZE));
  }

  async function handleCropConfirm() {
    if (!cropDraft) {
      return;
    }

    try {
      setCropBusy(true);
      const croppedBlob = await createCroppedBlob(cropDraft, cropZoom, cropOffset.x, cropOffset.y);
      const nextPreviewUrl = await readBlobAsDataUrl(croppedBlob);
      setPreviewUrl(nextPreviewUrl);
      setSaved(false);
      setPendingLogoBlob(croppedBlob);
      setFileName(cropDraft.fileName);
      setCropDraft(null);
    } catch (error) {
      showLogoAlert(error instanceof Error ? error.message : "คร็อปรูปโลโก้ไม่สำเร็จ");
    } finally {
      setCropBusy(false);
    }
  }

  function handleCropClose() {
    if (cropBusy) {
      return;
    }

    setCropDraft(null);
  }

  async function handleLogoSave() {
    try {
      if (!previewUrl || !pendingLogoBlob) {
        setShellAlert({ message: "เลือกรูปภาพโลโก้ก่อนบันทึก", tone: "danger" });
        return;
      }

      const signedUpload = await requestSignedUpload(`store-logo-${Date.now()}.webp`, "image/webp", pendingLogoBlob.size, "STORE_LOGO");
      await uploadBlobToR2(signedUpload, pendingLogoBlob);

      if (!signedUpload.publicUrl) {
        throw new Error("ยังไม่มี public URL สำหรับโลโก้ร้าน");
      }

      const csrfToken = await ensureCsrfToken({ forceRefresh: true });
      const response = await fetch("/api/auth/owner-logo", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken || "",
        },
        body: JSON.stringify({
          logoUrl: signedUpload.publicUrl,
          uploadedKey: signedUpload.objectKey,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiMessage(response, "บันทึกรูปภาพโลโก้ร้านไม่สำเร็จ"));
      }

      setSavedLogo(signedUpload.publicUrl);
      setPendingLogoBlob(null);
      setShellAlert({ message: "บันทึกรูปภาพโลโก้ร้านแล้ว", tone: "success" });
      router.refresh();
    } catch (error) {
      setShellAlert({
        message: error instanceof Error ? error.message : "บันทึกรูปภาพโลโก้ร้านไม่สำเร็จ",
        tone: "danger",
      });
    }
  }

  const cropModal = cropDraft ? (
    <CropModal
      draft={cropDraft}
      zoom={cropZoom}
      offsetX={cropOffset.x}
      offsetY={cropOffset.y}
      busy={cropBusy}
      title="ครอปรูปภาพโลโก้ร้าน"
      description="ลากภาพเพื่อจัดตำแหน่ง และใช้ตัวเลื่อนเพื่อซูมให้โลโก้อยู่ในกรอบสี่เหลี่ยม"
      confirmLabel="ยืนยันรูปโลโก้"
      busyLabel="กำลังคร็อป..."
      onClose={handleCropClose}
      onConfirm={handleCropConfirm}
      onZoomChange={handleCropZoomChange}
      onOffsetChange={handleCropOffsetChange}
    />
  ) : null;

  if (compact) {
    return (
      <div className="grid gap-4 max-[640px]:gap-3">
        <label
          className="grid aspect-square min-h-[206px] cursor-pointer place-items-center overflow-hidden rounded-[14px] border border-dashed border-[rgba(100,120,160,0.32)] bg-[var(--field-bg)]"
          aria-label="เลือกโลโก้ร้าน"
        >
          {previewUrl ? (
            <span
              className="h-full w-full bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${previewUrl})` }}
              role="img"
              aria-label={fileName || "โลโก้ร้าน"}
            />
          ) : (
            <span className="text-[0.95rem] font-semibold text-[var(--foreground-soft)]">โลโก้ร้าน</span>
          )}
          <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} />
        </label>
        {previewUrl ? (
          <button type="button" className={`${primaryButtonClass} min-h-[38px] text-[0.86rem]`} onClick={handleLogoSave}>
            บันทึกรูปภาพโลโก้ร้าน
          </button>
        ) : null}
        {cropModal}
      </div>
    );
  }

  return (
    <div className="mt-2 grid gap-4">
      <div className="flex flex-wrap justify-start gap-3 max-[900px]:[&>*]:w-full">
        <label className={`${primaryButtonClass} cursor-pointer`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className="opacity-80" aria-hidden="true">
            <g fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="14" height="14" x="5" y="5" rx="4" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m5.14 15.32l3.55-3.754A1.75 1.75 0 0 1 9.969 11c.479 0 .938.204 1.277.566L15.387 16m-1.806-1.934l1.432-1.533a1.75 1.75 0 0 1 1.277-.566c.48 0 .939.204 1.277.566l1.274 1.43m-5.063-4.63h.009"
              />
            </g>
          </svg>
          {saved ? "เลือกโลโก้ร้านของคุณใหม่" : "เลือกรูปภาพโลโก้ร้านของคุณ"}
          <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} />
        </label>
      </div>

      {previewUrl && !saved ? (
        <button type="button" className={`${primaryButtonClass} w-fit max-[900px]:w-full`} onClick={handleLogoSave}>
          บันทึกรูปภาพโลโก้ร้าน
        </button>
      ) : null}
      {cropModal}
    </div>
  );
}
