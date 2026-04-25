"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
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

const inputClass =
  "h-[46px] w-full rounded-[10px] border border-[rgba(100,120,160,0.22)] bg-[rgba(14,18,28,0.7)] px-[14px] text-[var(--foreground)] outline-none transition placeholder:text-[#556070] focus:border-[rgba(108,92,231,0.5)] focus:shadow-[0_0_0_4px_var(--ring)] disabled:cursor-not-allowed disabled:opacity-[0.62]";

const primaryButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-transparent bg-[linear-gradient(135deg,var(--brand)_0%,#8070f0_100%)] px-[18px] font-bold text-white shadow-[rgba(108,92,231,0.18)_0_6px_14px] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62]";

const activeGhostButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[rgba(22,27,38,0.8)] px-[18px] font-bold text-white transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[rgba(0,0,0,0.15)_0_5px_10px] disabled:cursor-not-allowed disabled:text-[var(--foreground-soft)] disabled:opacity-[0.62]";

const dangerGhostButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[rgba(232,93,117,0.3)] bg-[rgba(232,93,117,0.08)] px-[18px] font-bold text-[#ff8fa2] transition hover:-translate-y-px hover:border-[rgba(232,93,117,0.5)] hover:bg-[rgba(232,93,117,0.14)] disabled:cursor-not-allowed disabled:opacity-[0.62]";

const fieldLabelClass = "text-[0.9rem] font-semibold text-[var(--foreground-soft)]";
const compactBankInputClass =
  "h-[42px] w-full rounded-[10px] border border-[rgba(100,120,160,0.22)] bg-[rgba(14,18,28,0.7)] px-3 text-[0.95rem] text-[var(--foreground)] outline-none transition placeholder:text-[#556070] focus:border-[rgba(108,92,231,0.5)] focus:shadow-[0_0_0_4px_var(--ring)] disabled:cursor-not-allowed disabled:opacity-[0.62]";
const compactFooterGhostButtonClass =
  "inline-flex min-h-[38px] items-center justify-center gap-[8px] rounded-[10px] border border-[var(--border)] bg-[rgba(22,27,38,0.8)] px-[14px] text-[0.92rem] font-bold text-white transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[rgba(0,0,0,0.15)_0_5px_10px] disabled:cursor-not-allowed disabled:text-[var(--foreground-soft)] disabled:opacity-[0.62]";
const compactFooterPrimaryButtonClass =
  "inline-flex min-h-[38px] items-center justify-center gap-[8px] rounded-[10px] border border-transparent bg-[linear-gradient(135deg,var(--brand)_0%,#8070f0_100%)] px-[16px] text-[0.9rem] font-bold text-white shadow-[rgba(108,92,231,0.18)_0_6px_14px] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62]";
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

type ConfirmPaymentSettingsModalProps = {
  busy: boolean;
  enabled: boolean;
  autoEnabled?: boolean;
  recipientLabel: string;
  bankSummary?: ReactNode;
  promptPaySummary?: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
};

type OwnerLogoContextValue = {
  previewUrl: string;
  setPreviewUrl: (url: string) => void;
  saved: boolean;
  setSaved: (saved: boolean) => void;
  setSavedLogo: (url: string) => void;
};

const OwnerLogoContext = createContext<OwnerLogoContextValue | null>(null);

const logoFileTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxLogoFileSize = 2 * 1024 * 1024;
const paymentQrFileTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxPaymentQrFileSize = 2 * 1024 * 1024;
export type PromptPayRecipientType = "MOBILE" | "NATIONAL_ID" | "TAX_ID" | "STATIC_QR" | "BANK_ACCOUNT";

export type OwnerPaymentSettingsValue = {
  promptPayEnabled: boolean;
  promptPayRecipientType: PromptPayRecipientType;
  promptPayId: string;
  promptPayMobileId: string;
  promptPayNationalId: string;
  promptPayTaxId: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  paymentQrImageUrl: string;
  paymentQrUploadedKey: string;
};

type PromptPayDrafts = Record<"MOBILE" | "NATIONAL_ID" | "TAX_ID", string>;

const promptPayRecipientOptions: Array<{ value: PromptPayRecipientType; label: string; helper: string }> = [
  { value: "MOBILE", label: "เบอร์พร้อมเพย์", helper: "เบอร์มือถือ 10 หลัก" },
  { value: "NATIONAL_ID", label: "เลขบัตรประชาชน", helper: "เลข 13 หลัก" },
  { value: "TAX_ID", label: "เลขผู้เสียภาษี", helper: "เลข 13 หลักของกิจการ" },
  { value: "STATIC_QR", label: "Static QR", helper: "อัปโหลด QR ธนาคาร" },
  { value: "BANK_ACCOUNT", label: "บัญชีธนาคาร", helper: "fallback เมื่อไม่มี QR" },
];

const thaiBankOptions = [
  "ธนาคารกสิกรไทย",
  "ธนาคารกรุงไทย",
  "ธนาคารกรุงเทพ",
  "ธนาคารไทยพาณิชย์",
  "ธนาคารกรุงศรีอยุธยา",
  "ธนาคารทหารไทยธนชาต",
  "ธนาคารออมสิน",
  "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร",
  "ธนาคารอาคารสงเคราะห์",
  "ธนาคารยูโอบี",
  "ธนาคารซีไอเอ็มบี ไทย",
  "ธนาคารแลนด์ แอนด์ เฮ้าส์",
  "ธนาคารเกียรตินาคินภัทร",
];
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

function ConfirmPaymentSettingsModal({ busy, enabled, recipientLabel, bankSummary, promptPaySummary, onClose, onConfirm }: ConfirmPaymentSettingsModalProps) {
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
    <div className="fixed inset-0 z-[300] grid place-items-center bg-[rgba(7,10,16,0.55)] p-4 backdrop-blur-[16px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(108,92,231,0.12),transparent_48%)]" />

      <div className="relative z-[1] grid w-[calc(100vw-32px)] max-w-[380px] gap-5 overflow-hidden rounded-none border border-[rgba(108,92,231,0.2)] bg-[linear-gradient(180deg,rgba(22,27,38,0.99),rgba(26,30,42,0.98))] p-5 shadow-[rgba(0,0,0,0.6)_0_40px_100px] max-[640px]:gap-4 max-[640px]:p-4">
        <div className="grid gap-3">
          <p className="m-0 text-left text-[0.7rem] font-bold uppercase tracking-[0.28em] text-[#9f91ff]">ยืนยันการบันทึก</p>
          <h2 className="m-0 text-[1.25rem] leading-tight tracking-[-0.04em] text-white">ต้องการบันทึกการตั้งค่านี้ใช่ไหม</h2>
          <div className="inline-grid w-full gap-2 rounded-none border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-3">
            <div className="grid gap-1">
              <span className="text-[0.78rem] text-[var(--foreground-soft)]">{enabled ? "ประเภทผู้รับเงิน" : "สถานะระบบ"}</span>
              <strong className="text-white text-[0.95rem]">{enabled ? recipientLabel : "ปิดใช้งานและซ่อนจากหน้าร้าน (Offline)"}</strong>
            </div>
            {promptPaySummary ? (
              <div className="grid gap-1 border-t border-[rgba(100,120,160,0.14)] pt-2">
                <span className="text-[0.78rem] text-[var(--foreground-soft)]">PromptPay {!enabled ? <span className="text-[#a499ff]">(บันทึกแบบรอเปิดใช้)</span> : null}</span>
                <div className={`text-[0.95rem] ${enabled ? "text-white" : "text-[rgba(255,255,255,0.65)]"}`}>{promptPaySummary}</div>
              </div>
            ) : null}
            {bankSummary ? (
              <div className="grid gap-1 border-t border-[rgba(100,120,160,0.14)] pt-2">
                <span className="text-[0.78rem] text-[var(--foreground-soft)]">บัญชีธนาคาร {!enabled ? <span className="text-[#a499ff]">(บันทึกแบบรอเปิดใช้)</span> : null}</span>
                <div className={`text-[0.95rem] ${enabled ? "text-white" : "text-[rgba(255,255,255,0.65)]"}`}>{bankSummary}</div>
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
      const csrfToken = await ensureCsrfToken({ forceRefresh: true });
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
      <div className="mt-5 flex flex-wrap justify-start gap-[10px] max-[900px]:[&>*]:w-full">
        <button type="submit" className={primaryButtonClass} disabled={pending}>
          {pending ? "กำลังอัปเดต..." : "อัปเดตรหัสผ่าน"}
        </button>
      </div>
    </form>
  );
}

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

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
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

  function handleReset() {
    setForm({ storeName: "", ownerName: "" });
    setSubmitState({
      status: "idle",
      message: "แก้ชื่อร้านและชื่อเจ้าของร้าน แล้วบันทึกเพื่ออัปเดต Status Store",
    });
  }

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
      const csrfToken = await ensureCsrfToken({ forceRefresh: true });
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
      <div className="mt-5 flex flex-wrap justify-start gap-3 max-[900px]:[&>*]:w-full">
        <button type="button" className={activeGhostButtonClass} onClick={handleReset} disabled={pending || !hasFormValues}>
          รีเซ็ต
        </button>
        <button type="submit" className={primaryButtonClass} disabled={pending || !canSaveProfile}>
          {pending ? "กำลังบันทึก..." : "บันทึกข้อมูลร้าน"}
        </button>
      </div>
    </form>
  );
}

function normalizeDigitInput(value: string) {
  return value.replace(/[\s-]/g, "");
}

function normalizePaymentSettings(value: OwnerPaymentSettingsValue): OwnerPaymentSettingsValue {
  const normalized: OwnerPaymentSettingsValue = {
    promptPayEnabled: value.promptPayEnabled,
    promptPayRecipientType: value.promptPayRecipientType,
    promptPayId: normalizeDigitInput(value.promptPayId.trim()),
    promptPayMobileId: normalizeDigitInput(value.promptPayMobileId.trim()),
    promptPayNationalId: normalizeDigitInput(value.promptPayNationalId.trim()),
    promptPayTaxId: normalizeDigitInput(value.promptPayTaxId.trim()),
    bankName: value.bankName.trim(),
    bankAccountName: value.bankAccountName.trim(),
    bankAccountNumber: normalizeDigitInput(value.bankAccountNumber.trim()),
    paymentQrImageUrl: value.paymentQrImageUrl.trim(),
    paymentQrUploadedKey: value.paymentQrUploadedKey.trim(),
  };

  if (normalized.promptPayRecipientType !== "STATIC_QR" && normalized.promptPayRecipientType !== "BANK_ACCOUNT") {
    normalized.paymentQrImageUrl = "";
    normalized.paymentQrUploadedKey = "";
  }

  if (normalized.promptPayRecipientType !== "MOBILE" && normalized.promptPayRecipientType !== "BANK_ACCOUNT") {
    normalized.promptPayMobileId = "";
  }

  if (normalized.promptPayRecipientType !== "NATIONAL_ID" && normalized.promptPayRecipientType !== "BANK_ACCOUNT") {
    normalized.promptPayNationalId = "";
  }

  if (normalized.promptPayRecipientType !== "TAX_ID" && normalized.promptPayRecipientType !== "BANK_ACCOUNT") {
    normalized.promptPayTaxId = "";
  }

  normalized.promptPayId =
    normalized.promptPayRecipientType === "MOBILE"
      ? normalized.promptPayMobileId
      : normalized.promptPayRecipientType === "NATIONAL_ID"
        ? normalized.promptPayNationalId
        : normalized.promptPayRecipientType === "TAX_ID"
          ? normalized.promptPayTaxId
          : "";

  // Auto-healing cascade: If a previous save aggressively set BANK_ACCOUNT as primary but the bank data was since wiped,
  // we gracefully fallback to whatever PromptPay data they still have available so the toggle switch works correctly.
  if (normalized.promptPayRecipientType === "BANK_ACCOUNT" && !normalized.bankName && !normalized.bankAccountName && !normalized.bankAccountNumber) {
    if (normalized.promptPayMobileId) {
      normalized.promptPayRecipientType = "MOBILE";
    } else if (normalized.promptPayNationalId) {
      normalized.promptPayRecipientType = "NATIONAL_ID";
    } else if (normalized.promptPayTaxId) {
      normalized.promptPayRecipientType = "TAX_ID";
    } else if (normalized.paymentQrImageUrl) {
      normalized.promptPayRecipientType = "STATIC_QR";
    }
  }

  return normalized;
}

function paymentSettingsEqual(left: OwnerPaymentSettingsValue, right: OwnerPaymentSettingsValue) {
  const normalizedLeft = normalizePaymentSettings(left);
  const normalizedRight = normalizePaymentSettings(right);

  // The user explicitly desires the ability to draft PromptPay data while the switch is OFF.
  // Therefore, we must evaluate the entire configuration for equality to detect their offline edits.
  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
}

function validatePaymentSettings(value: OwnerPaymentSettingsValue, editorType: PromptPayRecipientType) {
  const normalized = normalizePaymentSettings(value);

  if (normalized.promptPayMobileId && !/^\d+$/.test(normalized.promptPayMobileId)) {
    return "เบอร์พร้อมเพย์ต้องเป็นตัวเลขเท่านั้น";
  }

  if (normalized.promptPayNationalId && !/^\d+$/.test(normalized.promptPayNationalId)) {
    return "เลขบัตรประชาชนต้องเป็นตัวเลขเท่านั้น";
  }

  if (normalized.promptPayTaxId && !/^\d+$/.test(normalized.promptPayTaxId)) {
    return "เลขผู้เสียภาษีต้องเป็นตัวเลขเท่านั้น";
  }

  if (normalized.bankAccountNumber && !/^\d+$/.test(normalized.bankAccountNumber)) {
    return "เลขบัญชีธนาคารต้องเป็นตัวเลขเท่านั้น";
  }

  if (normalized.promptPayMobileId && !/^0\d{9}$/.test(normalized.promptPayMobileId)) {
    return "เบอร์พร้อมเพย์ต้องเป็นเบอร์มือถือไทย 10 หลัก";
  }

  if (normalized.promptPayNationalId && !/^\d{13}$/.test(normalized.promptPayNationalId)) {
    return "เลขบัตรประชาชนต้องมี 13 หลัก";
  }

  if (normalized.promptPayTaxId && !/^\d{13}$/.test(normalized.promptPayTaxId)) {
    return "เลขผู้เสียภาษีต้องมี 13 หลัก";
  }

  if (normalized.bankAccountNumber && !/^\d{6,20}$/.test(normalized.bankAccountNumber)) {
    return "เลขบัญชีธนาคารต้องมี 6-20 หลัก";
  }

  if (editorType === "BANK_ACCOUNT") {
    const hasAnyBankField = Boolean(normalized.bankName || normalized.bankAccountName || normalized.bankAccountNumber);
    const hasAllBankFields = Boolean(normalized.bankName && normalized.bankAccountName && normalized.bankAccountNumber);

    if (hasAnyBankField && !hasAllBankFields) {
      return "กรอกข้อมูลบัญชีธนาคารให้ครบก่อนบันทึก";
    }
  }

  if (!normalized.promptPayEnabled) {
    return null;
  }

  let promptPayError = null;

  if (normalized.promptPayRecipientType === "MOBILE" && !normalized.promptPayMobileId) {
    promptPayError = "กรอกเบอร์พร้อมเพย์ก่อนเปิดใช้";
  } else if (normalized.promptPayRecipientType === "NATIONAL_ID" && !normalized.promptPayNationalId) {
    promptPayError = "กรอกเลขบัตรประชาชนก่อนเปิดใช้";
  } else if (normalized.promptPayRecipientType === "TAX_ID" && !normalized.promptPayTaxId) {
    promptPayError = "กรอกเลขผู้เสียภาษีก่อนเปิดใช้";
  } else if (normalized.promptPayRecipientType === "STATIC_QR" && (!normalized.paymentQrImageUrl || !normalized.paymentQrUploadedKey)) {
    promptPayError = "อัปโหลดรูป Static QR ก่อนเปิดใช้";
  } else if (normalized.promptPayRecipientType === "BANK_ACCOUNT" && (!normalized.bankName || !normalized.bankAccountName || !normalized.bankAccountNumber)) {
    promptPayError = "กรอกข้อมูลบัญชีธนาคารให้ครบก่อนเปิดใช้งาน";
  }

  // If there's a validation error from an invisible PromptPay tab, BUT the user is looking at the Bank Account...
  // It's extremely confusing to tell them to fill out a tab they aren't looking at.
  // Instead, instruct them to simply fill out the Bank Account they are currently viewing!
  if (promptPayError && editorType === "BANK_ACCOUNT") {
    return "กรอกข้อมูลบัญชีธนาคารให้ครบก่อนเปิดใช้งาน";
  }

  return promptPayError;
}

function isEditorTypeCleared(settings: OwnerPaymentSettingsValue, editorType: PromptPayRecipientType) {
  if (editorType === "MOBILE") {
    return !settings.promptPayMobileId;
  }

  if (editorType === "NATIONAL_ID") {
    return !settings.promptPayNationalId;
  }

  if (editorType === "TAX_ID") {
    return !settings.promptPayTaxId;
  }

  if (editorType === "STATIC_QR") {
    return !settings.paymentQrImageUrl && !settings.paymentQrUploadedKey;
  }

  if (editorType === "BANK_ACCOUNT") {
    return !settings.bankName && !settings.bankAccountName && !settings.bankAccountNumber;
  }

  return false;
}

function preparePaymentSettingsForSubmit(
  value: OwnerPaymentSettingsValue,
  editorType: PromptPayRecipientType,
  savedPromptPayEnabled: boolean
): OwnerPaymentSettingsValue {
  const normalized = normalizePaymentSettings(value);

  // If the promptPay feature is enabled, but the active editor is cleared...
  if (normalized.promptPayEnabled && isEditorTypeCleared(normalized, normalized.promptPayRecipientType)) {
    const rawHasMobile = Boolean(value.promptPayMobileId);
    const rawHasNationalId = Boolean(value.promptPayNationalId);
    const rawHasTaxId = Boolean(value.promptPayTaxId);
    const rawHasStaticQr = Boolean(value.paymentQrImageUrl);
    
    const hasAllBankFields = Boolean(value.bankName && value.bankAccountName && value.bankAccountNumber);
    const hasAnyRawPromptPay = rawHasMobile || rawHasNationalId || rawHasTaxId || rawHasStaticQr;

    // If the user's entire core PromptPay configuration is genuinely empty, BUT they have a complete Bank Account...
    // Smartly shift the primary recipient type to BANK_ACCOUNT so it can be legitimately saved and used as primary.
    // This allows users who hit "Reset" on their last PromptPay method to seamlessly save their Bank Account instead.
    if (!hasAnyRawPromptPay && hasAllBankFields) {
      return { ...normalized, promptPayRecipientType: "BANK_ACCOUNT" };
    }

    // If they genuinely wiped EVERYTHING out of the entire form (no QR, no bank account).
    // We only auto-disable if the feature was ALREADY enabled in their saved settings.
    // If it wasn't, it means they just toggled it ON right now, so we must force them to fill it out via validation!
    if (!hasAnyRawPromptPay && !Boolean(value.bankName || value.bankAccountName || value.bankAccountNumber)) {
      if (savedPromptPayEnabled) {
        return { ...normalized, promptPayEnabled: false };
      }
      return normalized;
    }

    // Otherwise, they just switched to an empty tab, or they are missing bank fields.
    // We simply return the normalized config, which allows `validatePaymentSettings` to output exactly what is missing on the active tab!
  }

  return normalized;
}

function promptPayIdFieldCopy(type: PromptPayRecipientType) {
  if (type === "MOBILE") {
    return { label: "เบอร์พร้อมเพย์", placeholder: "เช่น 0812345678", maxLength: 10 };
  }

  if (type === "NATIONAL_ID") {
    return { label: "เลขบัตรประชาชน", placeholder: "เลข 13 หลัก", maxLength: 13 };
  }

  if (type === "TAX_ID") {
    return { label: "เลขผู้เสียภาษี/นิติบุคคล", placeholder: "เลข 13 หลัก", maxLength: 13 };
  }

  return { label: "PromptPay ID", placeholder: "เลขพร้อมเพย์", maxLength: 13 };
}

function createPromptPayDrafts(settings: OwnerPaymentSettingsValue): PromptPayDrafts {
  return {
    MOBILE: settings.promptPayMobileId || (settings.promptPayRecipientType === "MOBILE" ? settings.promptPayId : ""),
    NATIONAL_ID: settings.promptPayNationalId || (settings.promptPayRecipientType === "NATIONAL_ID" ? settings.promptPayId : ""),
    TAX_ID: settings.promptPayTaxId || (settings.promptPayRecipientType === "TAX_ID" ? settings.promptPayId : ""),
  };
}

function clearPaymentSettingsForType(settings: OwnerPaymentSettingsValue, type: PromptPayRecipientType): OwnerPaymentSettingsValue {
  if (type === "MOBILE") {
    return {
      ...settings,
      promptPayId: "",
      promptPayMobileId: "",
    };
  }

  if (type === "NATIONAL_ID") {
    return {
      ...settings,
      promptPayId: "",
      promptPayNationalId: "",
    };
  }

  if (type === "TAX_ID") {
    return {
      ...settings,
      promptPayId: "",
      promptPayTaxId: "",
    };
  }

  if (type === "STATIC_QR") {
    return {
      ...settings,
      paymentQrImageUrl: "",
      paymentQrUploadedKey: "",
    };
  }

  if (type === "BANK_ACCOUNT") {
    return {
      ...settings,
      bankName: "",
      bankAccountName: "",
      bankAccountNumber: "",
    };
  }

  return settings;
}

function resolveEditorType(settings: OwnerPaymentSettingsValue): PromptPayRecipientType {
  const hasAnyData = Boolean(
    settings.promptPayMobileId ||
      settings.promptPayNationalId ||
      settings.promptPayTaxId ||
      settings.paymentQrImageUrl ||
      settings.paymentQrUploadedKey ||
      settings.bankName ||
      settings.bankAccountNumber
  );

  // If there is absolutely no data left in the configuration, default back to the primary Mobile PromptPay tab.
  if (!hasAnyData) {
    return "MOBILE";
  }

  return settings.promptPayRecipientType || "MOBILE";
}

export function OwnerPaymentSettingsClient({ initialSettings }: { initialSettings: OwnerPaymentSettingsValue }) {
  const { setShellAlert } = useBackofficeShellAlert();
  const router = useRouter();
  const [savedSettings, setSavedSettings] = useState(() => {
    const base = normalizePaymentSettings(initialSettings);
    const resolvedType = resolveEditorType(base);
    if (base.promptPayRecipientType !== resolvedType) {
      base.promptPayRecipientType = resolvedType;
    }
    return base;
  });
  const [form, setForm] = useState(() => {
    const base = normalizePaymentSettings(initialSettings);
    const resolvedType = resolveEditorType(base);
    if (base.promptPayRecipientType !== resolvedType) {
      base.promptPayRecipientType = resolvedType;
    }
    return base;
  });
  const [editorType, setEditorType] = useState<PromptPayRecipientType>(() => resolveEditorType(normalizePaymentSettings(initialSettings)));
  const [promptPayDrafts, setPromptPayDrafts] = useState<PromptPayDrafts>(() => createPromptPayDrafts(initialSettings));
  const [uploadingQr, setUploadingQr] = useState(false);
  const [qrCropDraft, setQrCropDraft] = useState<CropDraft | null>(null);
  const [qrCropZoom, setQrCropZoom] = useState(1);
  const [qrCropOffset, setQrCropOffset] = useState({ x: 0, y: 0 });
  const [qrCropBusy, setQrCropBusy] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const bankDropdownRef = useRef<HTMLDivElement | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: "",
  });

  const [submitAutoEnabled, setSubmitAutoEnabled] = useState(false);

  const pending = submitState.status === "saving" || uploadingQr;
  const effectivelyDisabled = pending;
  const bankFormIncomplete =
    editorType === "BANK_ACCOUNT" &&
    Boolean(form.bankName || form.bankAccountName || form.bankAccountNumber) &&
    !(form.bankName && form.bankAccountName && form.bankAccountNumber);
  const targetPreviewForm = confirmSaveOpen && submitAutoEnabled ? { ...form, promptPayEnabled: true } : form;
  const submitPreviewSettings = preparePaymentSettingsForSubmit(targetPreviewForm, editorType, savedSettings.promptPayEnabled);
  const validationMessage = bankFormIncomplete ? "กรอกข้อมูลบัญชีธนาคารให้ครบก่อนบันทึก" : validatePaymentSettings(submitPreviewSettings, editorType);
  
  // Localize the dirty check so the Save button only activates if the CURRENTLY VIEWED tab or global switch actually has changes.
  const isGlobalSwitchDirty = form.promptPayEnabled !== savedSettings.promptPayEnabled;
  const isActiveTabDirty = (() => {
    if (editorType === "BANK_ACCOUNT") {
      return (
        form.bankName !== savedSettings.bankName ||
        form.bankAccountName !== savedSettings.bankAccountName ||
        form.bankAccountNumber !== savedSettings.bankAccountNumber
      );
    }
    if (editorType === "MOBILE") return form.promptPayMobileId !== savedSettings.promptPayMobileId;
    if (editorType === "NATIONAL_ID") return form.promptPayNationalId !== savedSettings.promptPayNationalId;
    if (editorType === "TAX_ID") return form.promptPayTaxId !== savedSettings.promptPayTaxId;
    if (editorType === "STATIC_QR") return form.paymentQrImageUrl !== savedSettings.paymentQrImageUrl || form.paymentQrUploadedKey !== savedSettings.paymentQrUploadedKey;
    return false;
  })();
  const isRecipientTypeDirty = form.promptPayRecipientType !== savedSettings.promptPayRecipientType && !isEditorTypeCleared(form, form.promptPayRecipientType);
  const hasIntentionalChanges = isGlobalSwitchDirty || isActiveTabDirty || isRecipientTypeDirty;

  const canSavePaymentSettings = !pending && !validationMessage && hasIntentionalChanges;
  const usesPromptPayId = editorType === "MOBILE" || editorType === "NATIONAL_ID" || editorType === "TAX_ID";
  const usesBankAccount = editorType === "BANK_ACCOUNT";
  const usesStaticQr = editorType === "STATIC_QR";
  const promptPayField = promptPayIdFieldCopy(editorType);
  const activePromptPayValue =
    editorType === "MOBILE"
      ? form.promptPayMobileId
      : editorType === "NATIONAL_ID"
        ? form.promptPayNationalId
        : editorType === "TAX_ID"
          ? form.promptPayTaxId
          : "";
  const paymentHintMessage =
    editorType === "BANK_ACCOUNT"
      ? "ใช้สำหรับระบบการโอนเงิน"
      : editorType === "STATIC_QR"
        ? "ใช้สำหรับแสดง Static QR"
        : "ใช้สำหรับสร้าง QR PromptPay";
  const resetTargetForm = clearPaymentSettingsForType(form, editorType);

  const resetDisabled = pending || paymentSettingsEqual(form, resetTargetForm);

  useEffect(() => {
    return () => {
      if (qrCropDraft?.objectUrl) {
        URL.revokeObjectURL(qrCropDraft.objectUrl);
      }
    };
  }, [qrCropDraft]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(event.target as Node)) {
        setBankDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!usesBankAccount || effectivelyDisabled) {
      setBankDropdownOpen(false);
    }
  }, [effectivelyDisabled, usesBankAccount]);

  async function handleQrUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!paymentQrFileTypes.has(file.type)) {
      setSubmitState({ status: "error", message: "รองรับเฉพาะไฟล์ PNG, JPG หรือ WEBP" });
      setShellAlert({ message: "รองรับเฉพาะไฟล์ PNG, JPG หรือ WEBP", tone: "danger" });
      return;
    }

    if (file.size > maxPaymentQrFileSize) {
      setSubmitState({ status: "error", message: "ไฟล์ QR ต้องไม่เกิน 2 MB" });
      setShellAlert({ message: "ไฟล์ QR ต้องไม่เกิน 2 MB", tone: "danger" });
      return;
    }

    try {
      const objectUrl = createImageObjectUrl(file);
      const image = await loadImage(objectUrl);
      setQrCropDraft({ fileName: file.name, objectUrl, image });
      setQrCropZoom(1);
      setQrCropOffset({ x: 0, y: 0 });
      setSubmitState({ status: "idle", message: "ครอป Static QR ก่อนอัปโหลด" });
    } catch (error) {
      setSubmitState({ status: "error", message: error instanceof Error ? error.message : "เตรียมรูป Static QR ไม่สำเร็จ" });
      setShellAlert({ message: "เตรียมรูป Static QR ไม่สำเร็จ", tone: "danger" });
    }
  }

  function handleQrCropZoomChange(nextZoom: number) {
    if (!qrCropDraft) {
      return;
    }

    setQrCropOffset((current) => clampOffset(qrCropDraft.image, nextZoom, current.x, current.y, CROP_VIEWPORT_SIZE));
    setQrCropZoom(nextZoom);
  }

  function handleQrCropOffsetChange(nextX: number, nextY: number) {
    if (!qrCropDraft) {
      return;
    }

    setQrCropOffset(clampOffset(qrCropDraft.image, qrCropZoom, nextX, nextY, CROP_VIEWPORT_SIZE));
  }

  function handleQrCropClose() {
    if (qrCropBusy) {
      return;
    }

    setQrCropDraft(null);
  }

  async function handleQrCropConfirm() {
    if (!qrCropDraft) {
      return;
    }

    try {
      setQrCropBusy(true);
      setUploadingQr(true);
      setSubmitState({ status: "saving", message: "กำลังอัปโหลด Static QR..." });

      const croppedBlob = await createCroppedBlob(qrCropDraft, qrCropZoom, qrCropOffset.x, qrCropOffset.y);
      const signedUpload = await requestSignedUpload(`payment-qr-${Date.now()}.webp`, "image/webp", croppedBlob.size, "PAYMENT_QR");
      await uploadBlobToR2(signedUpload, croppedBlob);

      const publicUrl = signedUpload.publicUrl;
      if (!publicUrl) {
        throw new Error("ไม่พบ public URL สำหรับ Static QR");
      }

      setForm((current) => ({
        ...current,
        promptPayRecipientType: "STATIC_QR",
        paymentQrImageUrl: publicUrl,
        paymentQrUploadedKey: signedUpload.objectKey,
      }));
      setQrCropDraft(null);
      setSubmitState({ status: "idle", message: "อัปโหลด Static QR แล้ว กดบันทึกเพื่อใช้งานจริง" });
      setShellAlert({ message: "อัปโหลด Static QR แล้ว", tone: "success" });
    } catch (error) {
      setSubmitState({ status: "error", message: error instanceof Error ? error.message : "อัปโหลด Static QR ไม่สำเร็จ กรุณาลองอีกครั้ง" });
      setShellAlert({ message: "อัปโหลด Static QR ไม่สำเร็จ", tone: "danger" });
    } finally {
      setQrCropBusy(false);
      setUploadingQr(false);
    }
  }

  async function performSubmit(overrideForm?: OwnerPaymentSettingsValue, isAutoEnable?: boolean): Promise<boolean> {
    const dataToSubmit = overrideForm || form;
    const nextSettings = preparePaymentSettingsForSubmit(dataToSubmit, editorType, savedSettings.promptPayEnabled);
    const errorMessage = validatePaymentSettings(nextSettings, editorType);
    if (errorMessage) {
      setSubmitState({ status: "error", message: errorMessage });
      setShellAlert({ message: errorMessage, tone: "danger" });
      return false;
    }

    if (paymentSettingsEqual(nextSettings, savedSettings)) {
      return true;
    }

    setSubmitState({ status: "saving", message: "กำลังบันทึกการรับชำระเงิน..." });

    try {
      const csrfToken = await ensureCsrfToken({ forceRefresh: true });
      const response = await fetch("/api/auth/owner-payment-settings", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken || "",
        },
        body: JSON.stringify(nextSettings),
      });

      if (!response.ok) {
        const message = await readApiMessage(response, "บันทึกการรับชำระเงินไม่สำเร็จ");
        setSubmitState({ status: "error", message });
        setShellAlert({ message, tone: "danger" });
        return false;
      }

      setForm(nextSettings);
      setSavedSettings(nextSettings);
      setPromptPayDrafts(createPromptPayDrafts(nextSettings));
      setConfirmSaveOpen(false);

      let successMessage = "บันทึกการรับชำระเงินแล้ว";
      if (!nextSettings.promptPayEnabled) {
        successMessage = overrideForm ? "ปิดใช้ QR / ข้อมูลโอนแล้ว" : "บันทึกปิดการรับชำระเงินแล้ว";
      } else {
        if (isAutoEnable) {
          successMessage = "เปิดใช้ QR / ข้อมูลโอน และบันทึกข้อมูลแล้ว";
        } else if (overrideForm) {
          successMessage = "เปิดใช้ QR / ข้อมูลโอนแล้ว";
        } else {
          const hasBank = Boolean(nextSettings.bankName && nextSettings.bankAccountNumber);
          let primaryMessage = "";

          if (nextSettings.promptPayRecipientType === "MOBILE") primaryMessage = "เบอร์พร้อมเพย์";
          else if (nextSettings.promptPayRecipientType === "NATIONAL_ID") primaryMessage = "เลขบัตรประชาชน";
          else if (nextSettings.promptPayRecipientType === "TAX_ID") primaryMessage = "เลขผู้เสียภาษี";
          else if (nextSettings.promptPayRecipientType === "STATIC_QR") primaryMessage = "รูป Static QR";
          else if (nextSettings.promptPayRecipientType === "BANK_ACCOUNT") primaryMessage = "บัญชีธนาคาร";

          if (nextSettings.promptPayRecipientType !== "BANK_ACCOUNT" && hasBank) {
            successMessage = `บันทึก${primaryMessage} และบัญชีธนาคารแล้ว`;
          } else {
            successMessage = `บันทึก${primaryMessage}แล้ว`;
          }
        }
      }

      setSubmitState({ status: "success", message: successMessage });
      setShellAlert({ message: successMessage, tone: "success" });
      router.refresh();
      return true;
    } catch {
      setSubmitState({ status: "error", message: "เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง" });
      setShellAlert({ message: "เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง", tone: "danger" });
      return false;
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedRaw = normalizePaymentSettings(form);
    const isWiped = isEditorTypeCleared(normalizedRaw, editorType);
    const requiresAutoEnable = !form.promptPayEnabled && !isWiped;

    const optimisticForm = { ...form, promptPayEnabled: requiresAutoEnable ? true : form.promptPayEnabled };
    const nextSettings = preparePaymentSettingsForSubmit(optimisticForm, editorType, savedSettings.promptPayEnabled);
    const errorMessage = validatePaymentSettings(nextSettings, editorType);
    
    if (errorMessage) {
      setSubmitState({ status: "error", message: errorMessage });
      setShellAlert({ message: errorMessage, tone: "danger" });
      return;
    }

    if (paymentSettingsEqual(nextSettings, savedSettings)) {
      return;
    }

    setSubmitAutoEnabled(requiresAutoEnable);
    setConfirmSaveOpen(true);
  }

  const qrCropModal = qrCropDraft ? (
    <CropModal
      draft={qrCropDraft}
      zoom={qrCropZoom}
      offsetX={qrCropOffset.x}
      offsetY={qrCropOffset.y}
      busy={qrCropBusy}
      title="ครอปรูป Static QR"
      description="จัด QR ให้อยู่ในกรอบสี่เหลี่ยมก่อนอัปโหลด เพื่อให้แสดงผลสวยและอ่านง่าย"
      confirmLabel="ยืนยัน QR"
      busyLabel="กำลังอัปโหลด..."
      onClose={handleQrCropClose}
      onConfirm={handleQrCropConfirm}
      onZoomChange={handleQrCropZoomChange}
      onOffsetChange={handleQrCropOffsetChange}
    />
  ) : null;

  const confirmSaveModal = confirmSaveOpen ? (
    <ConfirmPaymentSettingsModal
      busy={submitState.status === "saving"}
      enabled={submitPreviewSettings.promptPayEnabled}
      autoEnabled={submitAutoEnabled}
      recipientLabel={`${promptPayRecipientOptions.find((option) => option.value === submitPreviewSettings.promptPayRecipientType)?.label || "-"}${
        submitPreviewSettings.bankName && submitPreviewSettings.bankAccountNumber && submitPreviewSettings.promptPayRecipientType !== "BANK_ACCOUNT" ? " และ โอนเงินธนาคาร" : ""
      }`}
      promptPaySummary={
        submitPreviewSettings.promptPayMobileId
          ? (
            <strong className="text-[1.02rem] font-bold tracking-[0.01em] text-white">
              เบอร์พร้อมเพย์ <span className="text-[1.08rem] font-extrabold text-[#f3edff]">{submitPreviewSettings.promptPayMobileId}</span>
            </strong>
          )
          : submitPreviewSettings.promptPayNationalId
            ? (
              <strong className="text-[1.02rem] font-bold tracking-[0.01em] text-white">
                เลขบัตรประชาชน <span className="text-[1.08rem] font-extrabold text-[#f3edff]">{submitPreviewSettings.promptPayNationalId}</span>
              </strong>
            )
            : submitPreviewSettings.promptPayTaxId
              ? (
                <strong className="text-[1.02rem] font-bold tracking-[0.01em] text-white">
                  เลขผู้เสียภาษี <span className="text-[1.08rem] font-extrabold text-[#f3edff]">{submitPreviewSettings.promptPayTaxId}</span>
                </strong>
              )
              : null
      }
      bankSummary={
        submitPreviewSettings.bankName && submitPreviewSettings.bankAccountNumber ? (
          <strong className="text-[1.02rem] font-bold tracking-[0.01em] text-white">
            {submitPreviewSettings.bankName} • <span className="text-[1.08rem] font-extrabold text-[#f3edff]">{submitPreviewSettings.bankAccountNumber}</span>
          </strong>
        ) : null
      }
      onClose={() => setConfirmSaveOpen(false)}
      onConfirm={() => {
        if (submitAutoEnabled) {
          performSubmit({ ...form, promptPayEnabled: true }, true);
        } else {
          performSubmit();
        }
      }}
    />
  ) : null;

  return (
    <form className="mt-2" onSubmit={handleSubmit}>
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--border)] bg-[rgba(14,18,28,0.55)] px-3 py-2.5 max-[640px]:flex-col max-[640px]:items-start">
          <span className="grid min-w-0 gap-1">
            <span className="truncate text-[0.95rem] font-bold leading-[1.45] text-white">เปิดใช้ QR / ข้อมูลโอน</span>
            <span className="text-[0.8rem] leading-[1.45] text-[var(--foreground-soft)] max-[640px]:text-[0.78rem]">แสดงใน Payment และเช็กสลิป</span>
          </span>
          <span className="stock-toggle-uiverse shrink-0">
            <span className="check" aria-hidden="true">
              <input
                id="owner-payment-settings-toggle"
                type="checkbox"
                checked={form.promptPayEnabled}
                onChange={async (event) => {
                  const isChecked = event.target.checked;
                  
                  // Only block if they actually have unsaved DATA typed into the inputs.
                  // We ignore `promptPayRecipientType` changes because simply clicking tabs mutates it, which creates false positives.
                  const hasAnyUnsavedChanges = 
                    form.promptPayMobileId !== savedSettings.promptPayMobileId ||
                    form.promptPayNationalId !== savedSettings.promptPayNationalId ||
                    form.promptPayTaxId !== savedSettings.promptPayTaxId ||
                    form.paymentQrImageUrl !== savedSettings.paymentQrImageUrl ||
                    form.paymentQrUploadedKey !== savedSettings.paymentQrUploadedKey ||
                    form.bankName !== savedSettings.bankName ||
                    form.bankAccountName !== savedSettings.bankAccountName ||
                    form.bankAccountNumber !== savedSettings.bankAccountNumber;

                  const isDirty = hasAnyUnsavedChanges;
                  if (isDirty) {
                    setShellAlert({ message: "กรุณากดบันทึกข้อมูลก่อนเปิด/ปิดใช้งาน", tone: "danger" });
                    return; // Immediately snap the controlled switch back!
                  }

                  // If they are attempting to turn the switch ON, strictly validate the form BEFORE allowing it.
                  if (isChecked) {
                    const testFormAsEnabled = { ...form, promptPayEnabled: true };
                    const testPrepared = preparePaymentSettingsForSubmit(testFormAsEnabled, editorType, savedSettings.promptPayEnabled);
                    const testBankIncomplete = editorType === "BANK_ACCOUNT" && Boolean(testFormAsEnabled.bankName || testFormAsEnabled.bankAccountName || testFormAsEnabled.bankAccountNumber) && !(testFormAsEnabled.bankName && testFormAsEnabled.bankAccountName && testFormAsEnabled.bankAccountNumber);
                    const validationError = testBankIncomplete ? "กรอกข้อมูลบัญชีธนาคารให้ครบก่อนเปิดใช้งาน" : validatePaymentSettings(testPrepared, editorType);

                    if (validationError) {
                      setShellAlert({ message: validationError, tone: "danger" });
                      return; // Immediately snap the controlled switch back to OFF! 
                    }
                  }

                  const nextForm = { ...form, promptPayEnabled: isChecked };
                  
                  // Proceed with a guaranteed valid optimistic toggle
                  setForm(nextForm);
                  await performSubmit(nextForm);
                }}
                disabled={pending}
                aria-label={form.promptPayEnabled ? "ปิดใช้ QR และข้อมูลโอนในหน้า Payment" : "เปิดใช้ QR และข้อมูลโอนในหน้า Payment"}
              />
              <label htmlFor="owner-payment-settings-toggle" />
            </span>
          </span>
        </div>

        <div className="grid gap-2.5">
          <span className={fieldLabelClass}>ประเภทผู้รับเงิน</span>
          <span className="text-[0.78rem] leading-[1.45] text-[var(--foreground-soft)]">คุณสามารถกรอกเบอร์พร้อมเพย์, เลขบัตรประชาชน, เลขผู้เสียภาษี, หรือรูป QR พร้อมกับข้อมูลบัญชีธนาคารได้</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {promptPayRecipientOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  editorType === option.value
                    ? `grid min-h-[54px] content-center gap-0.5 rounded-[10px] border px-3 py-1.5 text-left text-white transition-colors ${
                        option.value === "BANK_ACCOUNT"
                          ? "border-[rgba(232,93,117,0.52)] bg-[rgba(232,93,117,0.14)] text-[#ffb0bd]"
                          : "border-[rgba(108,92,231,0.55)] bg-[rgba(108,92,231,0.16)]"
                      } ${option.value === "BANK_ACCOUNT" ? "col-span-1 sm:col-span-2 mx-auto w-full sm:max-w-[calc(50%_-_2px)] justify-items-center text-center" : ""}`
                    : option.value === "BANK_ACCOUNT"
                      ? "col-span-1 sm:col-span-2 mx-auto grid min-h-[54px] w-full sm:max-w-[calc(50%_-_2px)] content-center justify-items-center gap-0.5 rounded-[10px] border border-[rgba(232,93,117,0.34)] bg-[rgba(232,93,117,0.08)] px-3 py-1.5 text-center text-[#ff9daf] transition hover:border-[rgba(232,93,117,0.5)] hover:bg-[rgba(232,93,117,0.12)]"
                      : "grid min-h-[54px] content-center gap-0.5 rounded-[10px] border border-[var(--border)] bg-[rgba(22,27,38,0.74)] px-3 py-1.5 text-left text-[var(--foreground)] transition hover:border-[var(--border-strong)]"
                }
                onClick={() => {
                  if (option.value === editorType) {
                    return;
                  }

                  setSubmitState({ status: "idle", message: "" });
                  setEditorType(option.value);

                  setForm((current) => {
                    const nextPromptPayId =
                      option.value === "MOBILE" || option.value === "NATIONAL_ID" || option.value === "TAX_ID"
                        ? promptPayDrafts[option.value]
                        : "";

                    if (option.value === "BANK_ACCOUNT") {
                      return current;
                    }

                    return {
                      ...current,
                      promptPayRecipientType: option.value,
                      promptPayId: nextPromptPayId,
                      promptPayMobileId: option.value === "MOBILE" ? nextPromptPayId : current.promptPayMobileId,
                      promptPayNationalId: option.value === "NATIONAL_ID" ? nextPromptPayId : current.promptPayNationalId,
                      promptPayTaxId: option.value === "TAX_ID" ? nextPromptPayId : current.promptPayTaxId,
                    };
                  });
                }}
                disabled={effectivelyDisabled}
              >
                <strong className="text-[0.86rem] leading-[1.2] [overflow-wrap:anywhere]">{option.label}</strong>
                <span className="text-[0.68rem] leading-[1.25] text-[var(--foreground-soft)] [overflow-wrap:anywhere]">{option.helper}</span>
              </button>
            ))}
          </div>
        </div>

        {usesPromptPayId ? (
          <label className="grid gap-2">
            <span className={fieldLabelClass}>{promptPayField.label}</span>
            <input
              className={inputClass}
              value={activePromptPayValue}
              inputMode="numeric"
              placeholder={promptPayField.placeholder}
              onChange={(event) => {
                const nextValue = normalizeDigitInput(event.target.value).slice(0, promptPayField.maxLength);
                if (editorType === "MOBILE" || editorType === "NATIONAL_ID" || editorType === "TAX_ID") {
                  setPromptPayDrafts((current) => ({ ...current, [editorType]: nextValue }));
                }
                setForm((current) => ({
                  ...current,
                  promptPayId: nextValue,
                  promptPayMobileId: editorType === "MOBILE" ? nextValue : current.promptPayMobileId,
                  promptPayNationalId: editorType === "NATIONAL_ID" ? nextValue : current.promptPayNationalId,
                  promptPayTaxId: editorType === "TAX_ID" ? nextValue : current.promptPayTaxId,
                }));
              }}
              disabled={effectivelyDisabled}
              maxLength={promptPayField.maxLength}
            />
          </label>
        ) : null}

        {usesBankAccount ? (
          <div className="grid gap-3">
            <label className="grid gap-1">
              <span className={fieldLabelClass}>ชื่อบัญชี</span>
              <input
                className={compactBankInputClass}
                value={form.bankAccountName}
                placeholder="ชื่อบัญชีรับเงิน"
                onChange={(event) => setForm((current) => ({ ...current, bankAccountName: event.target.value }))}
                disabled={effectivelyDisabled}
                maxLength={120}
              />
            </label>
            <label className="grid gap-1">
              <span className={fieldLabelClass}>ธนาคาร</span>
              <div className="relative" ref={bankDropdownRef}>
                <button
                  type="button"
                  className={`${compactBankInputClass} flex items-center justify-between gap-3 text-left ${bankDropdownOpen ? "border-[rgba(108,92,231,0.5)] shadow-[0_0_0_4px_var(--ring)]" : ""}`}
                  onClick={() => setBankDropdownOpen((current) => !current)}
                  disabled={effectivelyDisabled}
                  aria-expanded={bankDropdownOpen}
                >
                  <span className={form.bankName ? "truncate text-[var(--foreground)]" : "truncate text-[#7d8799]"}>{form.bankName || "เลือกธนาคาร"}</span>
                  <span className={`shrink-0 text-[var(--foreground-soft)] transition ${bankDropdownOpen ? "rotate-180" : ""}`}>
                    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
                      <path d="M5.47 7.97a.75.75 0 0 1 1.06 0L10 11.44l3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </span>
                </button>
                {bankDropdownOpen ? (
                  <div className="absolute bottom-[calc(100%+10px)] left-0 right-0 z-20 overflow-hidden border border-[rgba(122,110,255,0.24)] bg-[linear-gradient(180deg,rgba(28,32,48,0.98),rgba(21,25,37,0.98))] shadow-[rgba(7,10,16,0.55)_0_18px_40px] max-[640px]:bottom-auto max-[640px]:top-[calc(100%+10px)]">
                    <div className="max-h-[240px] overflow-y-auto py-2 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-[rgba(15,19,29,0.78)] [&::-webkit-scrollbar-thumb]:bg-[linear-gradient(180deg,rgba(240,106,223,0.8),rgba(169,108,255,0.8))] hover:[&::-webkit-scrollbar-thumb]:bg-[linear-gradient(180deg,rgba(240,106,223,1),rgba(169,108,255,1))]">
                      {thaiBankOptions.map((bankName) => {
                        const active = form.bankName === bankName;

                        return (
                          <button
                            key={bankName}
                            type="button"
                            className={`flex w-full items-center px-4 py-3 text-left text-[0.95rem] leading-[1.25] transition ${active ? "bg-[rgba(108,92,231,0.16)] text-[#b9aeff]" : "text-[rgba(255,255,255,0.9)] hover:bg-[rgba(255,255,255,0.04)]"}`}
                            onClick={() => {
                              setForm((current) => ({ ...current, bankName }));
                              setBankDropdownOpen(false);
                            }}
                          >
                            {bankName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </label>
            <label className="grid gap-1">
              <span className={fieldLabelClass}>เลขบัญชี</span>
              <input
                className={compactBankInputClass}
                value={form.bankAccountNumber}
                inputMode="numeric"
                placeholder="ตัวเลข 6-20 หลัก"
                onChange={(event) => setForm((current) => ({ ...current, bankAccountNumber: event.target.value }))}
                disabled={effectivelyDisabled}
                maxLength={32}
              />
            </label>
          </div>
        ) : null}

        {usesStaticQr ? (
          <div className="grid gap-2.5 rounded-[10px] border border-[var(--border)] bg-[rgba(14,18,28,0.55)] p-3">
            <div className="flex items-center justify-between gap-3 max-[640px]:flex-col max-[640px]:items-stretch">
              <div className="min-w-0">
                <strong className="block text-[0.95rem] leading-[1.3] text-white">Static QR</strong>
                <span className="block truncate text-[0.76rem] text-[var(--foreground-soft)]">ตรวจยอดจากสลิปเอง</span>
              </div>
              <label className={`${activeGhostButtonClass} min-h-[36px] shrink-0 cursor-pointer px-3 text-[0.86rem] max-[640px]:w-full`}>
                {uploadingQr ? "กำลังอัปโหลด..." : "อัปโหลด QR"}
                <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleQrUpload} disabled={effectivelyDisabled} />
              </label>
            </div>
            {form.paymentQrImageUrl ? (
              <div className="flex items-center gap-2 rounded-[10px] border border-[rgba(100,120,160,0.12)] bg-[rgba(255,255,255,0.03)] p-2 max-[520px]:grid max-[520px]:grid-cols-[44px_minmax(0,1fr)]">
                <span className="h-11 w-11 shrink-0 rounded-[8px] border border-[rgba(100,120,160,0.18)] bg-cover bg-center" style={{ backgroundImage: `url(${form.paymentQrImageUrl})` }} />
                <span className="min-w-0 flex-1 truncate text-[0.82rem] text-[var(--foreground-soft)]">มีรูป QR แล้ว</span>
                <button
                  type="button"
                  className={`${dangerGhostButtonClass} min-h-[34px] shrink-0 px-3 text-[0.82rem]`}
                  onClick={() => setForm((current) => ({ ...current, paymentQrImageUrl: "", paymentQrUploadedKey: "" }))}
                  disabled={effectivelyDisabled}
                >
                  ลบ
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <p className="m-0 text-[0.8rem] leading-[1.45] text-[var(--foreground-soft)] [overflow-wrap:anywhere]">
          {submitState.status === "success" || submitState.status === "saving" ? submitState.message : paymentHintMessage}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap justify-start gap-3 max-[900px]:[&>*]:w-full">
        <button
          type="button"
          className={compactFooterGhostButtonClass}
          onClick={() => {
            const nextForm = clearPaymentSettingsForType(form, editorType);
            setForm(nextForm);
            setPromptPayDrafts(createPromptPayDrafts(nextForm));
            setSubmitState({ status: "idle", message: "" });
            setConfirmSaveOpen(false);
            setBankDropdownOpen(false);
          }}
          disabled={resetDisabled}
        >
          รีเซ็ต
        </button>
        <button
          type="button"
          className={compactFooterGhostButtonClass}
          onClick={() => {
            const nextForm = (() => {
              const current = form;
              const revertForm = { ...current };
              if (editorType === "MOBILE") {
                revertForm.promptPayMobileId = savedSettings.promptPayMobileId;
                revertForm.promptPayId = savedSettings.promptPayMobileId;
              } else if (editorType === "NATIONAL_ID") {
                revertForm.promptPayNationalId = savedSettings.promptPayNationalId;
                revertForm.promptPayId = savedSettings.promptPayNationalId;
              } else if (editorType === "TAX_ID") {
                revertForm.promptPayTaxId = savedSettings.promptPayTaxId;
                revertForm.promptPayId = savedSettings.promptPayTaxId;
              } else if (editorType === "STATIC_QR") {
                revertForm.paymentQrImageUrl = savedSettings.paymentQrImageUrl;
                revertForm.paymentQrUploadedKey = savedSettings.paymentQrUploadedKey;
              } else if (editorType === "BANK_ACCOUNT") {
                revertForm.bankName = savedSettings.bankName;
                revertForm.bankAccountName = savedSettings.bankAccountName;
                revertForm.bankAccountNumber = savedSettings.bankAccountNumber;
              }
              return revertForm;
            })();
            setForm(nextForm);
            setPromptPayDrafts(createPromptPayDrafts(nextForm));
            setSubmitState({ status: "idle", message: "" });
            setConfirmSaveOpen(false);
            setBankDropdownOpen(false);
          }}
          disabled={pending || !isActiveTabDirty}
        >
          ย้อนกลับ
        </button>
        <button type="submit" className={compactFooterPrimaryButtonClass} disabled={!canSavePaymentSettings}>
          {submitState.status === "saving" ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>
      {qrCropModal}
      {confirmSaveModal}
    </form>
  );
}
