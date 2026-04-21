"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBackofficeShellAlert } from "@/components/backoffice-shell";
import { CropModal } from "@/components/product-management-studio/crop-modal";
import { clampOffset, createCroppedBlob, createImageObjectUrl, CROP_VIEWPORT_SIZE, loadImage } from "@/components/product-management-studio/lib";
import type { CropDraft } from "@/components/product-management-studio/types";
import { ensureCsrfToken } from "@/lib/csrf";

const inputClass =
  "h-[46px] w-full rounded-[10px] border border-[rgba(100,120,160,0.22)] bg-[rgba(14,18,28,0.7)] px-[14px] text-[var(--foreground)] outline-none transition placeholder:text-[#556070] focus:border-[rgba(108,92,231,0.5)] focus:shadow-[0_0_0_4px_var(--ring)] disabled:cursor-not-allowed disabled:opacity-[0.62]";

const primaryButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-transparent bg-[linear-gradient(135deg,var(--brand)_0%,#8070f0_100%)] px-[18px] font-bold text-white shadow-[rgba(108,92,231,0.18)_0_6px_14px] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62]";

const activeGhostButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[rgba(22,27,38,0.8)] px-[18px] font-bold text-white transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[rgba(0,0,0,0.15)_0_5px_10px] disabled:cursor-not-allowed disabled:text-[var(--foreground-soft)] disabled:opacity-[0.62]";

const fieldLabelClass = "text-[0.9rem] font-semibold text-[var(--foreground-soft)]";

const passwordInputWrapClass =
  "grid h-[46px] grid-cols-[minmax(0,1fr)_42px] items-center rounded-[10px] border border-[rgba(100,120,160,0.22)] bg-[rgba(14,18,28,0.7)] transition focus-within:border-[rgba(108,92,231,0.5)] focus-within:shadow-[0_0_0_4px_var(--ring)]";

const passwordInputClass =
  "h-full min-w-0 rounded-l-[10px] border-0 bg-transparent px-[14px] text-[var(--foreground)] outline-none placeholder:text-[#556070] disabled:cursor-not-allowed disabled:opacity-[0.62]";

const passwordToggleClass =
  "inline-flex h-full w-[42px] items-center justify-center rounded-r-[10px] text-[var(--foreground-soft)] transition hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-[0.62]";

type SubmitState = {
  status: "idle" | "saving" | "success" | "error";
  message: string;
};

type OwnerLogoContextValue = {
  previewUrl: string;
  setPreviewUrl: (url: string) => void;
  saved: boolean;
  setSaved: (saved: boolean) => void;
  savePreviewUrl: () => boolean;
};

const OwnerLogoContext = createContext<OwnerLogoContextValue | null>(null);

const logoFileTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxLogoFileSize = 2 * 1024 * 1024;
export function OwnerLogoProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const storageKey = `owner-store-logo-preview-${userId}`;
  const [previewUrl, setPreviewUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      setPreviewUrl(stored);
      setSaved(true);
    }
  }, [storageKey]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function savePreviewUrl() {
    if (!previewUrl) {
      return false;
    }

    window.localStorage.setItem(storageKey, previewUrl);
    setSaved(true);
    return true;
  }

  return (
    <OwnerLogoContext.Provider value={{ previewUrl, setPreviewUrl, saved, setSaved, savePreviewUrl }}>
      {children}
    </OwnerLogoContext.Provider>
  );
}

function useOwnerLogo() {
  const context = useContext(OwnerLogoContext);

  if (!context) {
    throw new Error("useOwnerLogo must be used inside OwnerLogoProvider");
  }

  return context;
}

async function readApiMessage(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error || fallback;
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์โลโก้หลังคร็อปได้"));
    reader.readAsDataURL(blob);
  });
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none">
      <path
        d="M3.5 12s3-5.5 8.5-5.5 8.5 5.5 8.5 5.5-3 5.5-8.5 5.5S3.5 12 3.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 14.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!open ? <path d="M5 19 19 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /> : null}
    </svg>
  );
}

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

export function OwnerLogoStatusPill() {
  const { previewUrl, saved } = useOwnerLogo();

  if (!previewUrl) {
    return null;
  }

  return <SelectedLogoStatus saved={saved} />;
}

function PasswordField({
  label,
  placeholder,
  autoComplete,
  value,
  visible,
  disabled,
  onChange,
  onToggle,
}: {
  label: string;
  placeholder: string;
  autoComplete: string;
  value: string;
  visible: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <label className="grid gap-2">
      <span className={fieldLabelClass}>{label}</span>
      <span className={passwordInputWrapClass}>
        <input
          className={passwordInputClass}
          placeholder={placeholder}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          maxLength={128}
        />
        <button
          type="button"
          className={passwordToggleClass}
          onClick={onToggle}
          disabled={disabled}
          aria-label={visible ? `ซ่อน${label}` : `แสดง${label}`}
          title={visible ? `ซ่อน${label}` : `แสดง${label}`}
        >
          <EyeIcon open={visible} />
        </button>
      </span>
    </label>
  );
}

export function OwnerPasswordClient() {
  const { setShellAlert } = useBackofficeShellAlert();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [visibleFields, setVisibleFields] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: "กรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่เพื่ออัปเดตบัญชีเจ้าของร้าน",
  });

  const pending = submitState.status === "saving";

  function showAlert(message: string, status: SubmitState["status"]) {
    setSubmitState({ status, message });
    setShellAlert({ message, tone: status === "error" ? "danger" : "success" });
  }

  function validatePasswordForm() {
    if (!form.currentPassword) {
      return "กรุณาระบุรหัสผ่านปัจจุบัน";
    }
    if (!form.newPassword) {
      return "กรุณาระบุรหัสผ่านใหม่";
    }
    if (!form.confirmPassword) {
      return "กรุณายืนยันรหัสผ่านใหม่";
    }

    if (form.currentPassword.length < 8 || form.newPassword.length < 8 || form.confirmPassword.length < 8) {
      return "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    }

    if (form.newPassword !== form.confirmPassword) {
      return "รหัสผ่านใหม่และช่องยืนยันไม่ตรงกัน";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validatePasswordForm();
    if (validationError) {
      showAlert(validationError, "error");
      return;
    }

    setSubmitState({ status: "saving", message: "กำลังอัปเดตรหัสผ่าน..." });

    try {
      const csrfToken = await ensureCsrfToken();
      const response = await fetch("/api/auth/password", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken || "",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        showAlert(await readApiMessage(response, "อัปเดตรหัสผ่านไม่สำเร็จ"), "error");
        return;
      }

      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showAlert("อัปเดตรหัสผ่านเรียบร้อยแล้ว", "success");
    } catch {
      showAlert("เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง", "error");
    }
  }

  return (
    <form className="mt-2" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4">
        <PasswordField
          label="รหัสผ่านปัจจุบัน"
          placeholder="รหัสผ่านปัจจุบัน"
          autoComplete="current-password"
          value={form.currentPassword}
          visible={visibleFields.currentPassword}
          disabled={pending}
          onChange={(value) => setForm((current) => ({ ...current, currentPassword: value }))}
          onToggle={() => setVisibleFields((current) => ({ ...current, currentPassword: !current.currentPassword }))}
        />
        <PasswordField
          label="รหัสผ่านใหม่"
          placeholder="รหัสผ่านใหม่"
          autoComplete="new-password"
          value={form.newPassword}
          visible={visibleFields.newPassword}
          disabled={pending}
          onChange={(value) => setForm((current) => ({ ...current, newPassword: value }))}
          onToggle={() => setVisibleFields((current) => ({ ...current, newPassword: !current.newPassword }))}
        />
        <PasswordField
          label="ยืนยันรหัสผ่านใหม่"
          placeholder="ยืนยันรหัสผ่านใหม่"
          autoComplete="new-password"
          value={form.confirmPassword}
          visible={visibleFields.confirmPassword}
          disabled={pending}
          onChange={(value) => setForm((current) => ({ ...current, confirmPassword: value }))}
          onToggle={() => setVisibleFields((current) => ({ ...current, confirmPassword: !current.confirmPassword }))}
        />
      </div>
      <div className="mt-5 flex flex-wrap justify-start gap-[10px] max-[720px]:[&>*]:w-full">
        <button type="submit" className={primaryButtonClass} disabled={pending}>
          {pending ? "กำลังอัปเดต..." : "อัปเดตรหัสผ่าน"}
        </button>
      </div>
    </form>
  );
}

export function OwnerLogoClient({ compact = false }: { compact?: boolean }) {
  const { setShellAlert } = useBackofficeShellAlert();
  const { previewUrl, setPreviewUrl, saved, setSaved, savePreviewUrl } = useOwnerLogo();
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropBusy, setCropBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (cropDraft?.objectUrl) {
        URL.revokeObjectURL(cropDraft.objectUrl);
      }
    };
  }, [cropDraft]);

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!logoFileTypes.has(file.type)) {
      setMessage("รองรับไฟล์ PNG, JPG หรือ WebP");
      event.target.value = "";
      return;
    }

    if (file.size > maxLogoFileSize) {
      setMessage("ไฟล์โลโก้ต้องไม่เกิน 2MB");
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
      setMessage("");
    } catch (error) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setMessage(error instanceof Error ? error.message : "ไม่สามารถเตรียมรูปภาพสำหรับคร็อบได้");
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
      setFileName(cropDraft.fileName);
      setCropDraft(null);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "คร็อปรูปโลโก้ไม่สำเร็จ");
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

  function handleLogoSave() {
    try {
      if (!savePreviewUrl()) {
        setShellAlert({ message: "เลือกรูปภาพโลโก้ก่อนบันทึก", tone: "danger" });
        return;
      }

      setShellAlert({ message: "บันทึกรูปภาพโลโก้ร้านแล้ว", tone: "success" });
    } catch {
      setShellAlert({ message: "บันทึกรูปภาพโลโก้ร้านในเครื่องนี้ไม่สำเร็จ", tone: "danger" });
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
      <div className="grid gap-3">
        <label
          className="grid aspect-square min-h-[206px] cursor-pointer place-items-center overflow-hidden rounded-[14px] border border-dashed border-[rgba(100,120,160,0.32)] bg-[rgba(14,18,28,0.64)]"
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
        {message ? <p className="text-[0.8rem] leading-[1.45] text-[var(--danger)]">{message}</p> : null}
        {cropModal}
      </div>
    );
  }

  return (
    <div className="mt-2 grid gap-4">
      <div className="flex flex-wrap justify-start gap-3 max-[720px]:[&>*]:w-full">
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
        <button type="button" className={`${primaryButtonClass} w-fit max-[720px]:w-full`} onClick={handleLogoSave}>
          บันทึกรูปภาพโลโก้ร้าน
        </button>
      ) : null}
      {message ? <p className="text-[0.86rem] leading-[1.5] text-[var(--danger)]">{message}</p> : null}
      {cropModal}
    </div>
  );
}

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
    <div className="grid aspect-square min-h-[206px] place-items-center overflow-hidden rounded-[14px] border border-dashed border-[rgba(100,120,160,0.32)] bg-[rgba(14,18,28,0.64)]">
      <span className="text-[0.95rem] font-semibold text-[var(--foreground-soft)]">โลโก้ร้าน</span>
    </div>
  );
}

export function OwnerProfileClient({
  storeName,
  ownerName,
  storeNamePlaceholder = "ชื่อร้าน",
  ownerNamePlaceholder = "ชื่อเจ้าของร้าน",
}: {
  storeName: string;
  ownerName: string;
  storeNamePlaceholder?: string;
  ownerNamePlaceholder?: string;
}) {
  const { setShellAlert } = useBackofficeShellAlert();
  const router = useRouter();
  const [savedForm, setSavedForm] = useState({ storeName, ownerName });
  const [form, setForm] = useState({ storeName, ownerName });
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: "แก้ชื่อร้านและชื่อเจ้าของร้าน แล้วบันทึกเพื่ออัปเดต Status Store",
  });

  const pending = submitState.status === "saving";
  const normalizedForm = {
    storeName: form.storeName.trim(),
    ownerName: form.ownerName.trim(),
  };
  const normalizedSavedForm = {
    storeName: savedForm.storeName.trim(),
    ownerName: savedForm.ownerName.trim(),
  };
  const hasFormValues = Boolean(normalizedForm.storeName || normalizedForm.ownerName);
  const profileChanged = normalizedForm.storeName !== normalizedSavedForm.storeName || normalizedForm.ownerName !== normalizedSavedForm.ownerName;
  const canSaveProfile = profileChanged && Boolean(normalizedForm.storeName && normalizedForm.ownerName);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextForm = normalizedForm;

    if (!nextForm.storeName || !nextForm.ownerName) {
      setSubmitState({ status: "error", message: "กรอกชื่อร้านและชื่อเจ้าของร้านให้ครบก่อนบันทึก" });
      setShellAlert({ message: "กรอกชื่อร้านและชื่อเจ้าของร้านให้ครบก่อนบันทึก", tone: "danger" });
      return;
    }

    if (!profileChanged) {
      return;
    }

    setSubmitState({ status: "saving", message: "กำลังบันทึกข้อมูลร้าน..." });

    try {
      const csrfToken = await ensureCsrfToken();
      const response = await fetch("/api/auth/owner-profile", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken || "",
        },
        body: JSON.stringify(nextForm),
      });

      if (!response.ok) {
        const errorMessage = await readApiMessage(response, "บันทึกข้อมูลร้านไม่สำเร็จ");
        setSubmitState({ status: "error", message: errorMessage });
        setShellAlert({ message: errorMessage, tone: "danger" });
        return;
      }

      setForm(nextForm);
      setSavedForm(nextForm);
      setSubmitState({ status: "success", message: "บันทึกข้อมูลร้านแล้ว Status Store จะอัปเดตตามข้อมูลล่าสุด" });
      setShellAlert({ message: "บันทึกข้อมูลร้านแล้ว", tone: "success" });
      router.refresh();
    } catch {
      setSubmitState({ status: "error", message: "เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง" });
      setShellAlert({ message: "เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง", tone: "danger" });
    }
  }

  return (
    <form className="mt-2" onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className={fieldLabelClass}>ชื่อร้าน</span>
          <input
            className={inputClass}
            value={form.storeName}
            placeholder={storeNamePlaceholder}
            onChange={(event) => setForm((current) => ({ ...current, storeName: event.target.value }))}
            disabled={pending}
            required
            maxLength={80}
          />
        </label>
        <label className="grid gap-2">
          <span className={fieldLabelClass}>ชื่อเจ้าของร้าน</span>
          <input
            className={inputClass}
            value={form.ownerName}
            placeholder={ownerNamePlaceholder}
            onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))}
            disabled={pending}
            required
            maxLength={80}
          />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap justify-start gap-3 max-[720px]:[&>*]:w-full">
        <button type="button" className={activeGhostButtonClass} onClick={() => setForm(savedForm)} disabled={pending || !hasFormValues}>
          รีเซ็ต
        </button>
        <button type="submit" className={primaryButtonClass} disabled={pending || !canSaveProfile}>
          {pending ? "กำลังบันทึก..." : "บันทึกข้อมูลร้าน"}
        </button>
      </div>
    </form>
  );
}
