import type { ReactNode } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type SubmitState = {
  status: "idle" | "saving" | "success" | "error";
  message: string;
};

export type PromptPayRecipientType = "MOBILE" | "NATIONAL_ID" | "TAX_ID" | "STATIC_QR" | "BANK_ACCOUNT";
export type OwnerThemeId = "violet" | "light" | "dark";

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

export type ConfirmPaymentSettingsModalProps = {
  busy: boolean;
  enabled: boolean;
  autoEnabled?: boolean;
  recipientLabel: string;
  bankSummary?: ReactNode;
  promptPaySummary?: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
};

export type OwnerLogoContextValue = {
  previewUrl: string;
  setPreviewUrl: (url: string) => void;
  saved: boolean;
  setSaved: (saved: boolean) => void;
  setSavedLogo: (url: string) => void;
};

export type PromptPayDrafts = Record<"MOBILE" | "NATIONAL_ID" | "TAX_ID", string>;

// ── Constants ────────────────────────────────────────────────────────────────

export const logoFileTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
export const maxLogoFileSize = 2 * 1024 * 1024;
export const paymentQrFileTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
export const maxPaymentQrFileSize = 2 * 1024 * 1024;
export const ownerThemeStorageKey = "pos-mans-owner-theme";

export const ownerThemeOptions: Array<{
  id: OwnerThemeId;
  label: string;
  description: string;
  preview: string;
}> = [
    {
      id: "violet",
      label: "Midnight Violet",
      description: "โทนหลักดั้งเดิมของระบบ ให้ฟีลเข้ม คม และเน้น accent แบบม่วง",
      preview: "linear-gradient(135deg, #6c5ce7 0%, #8070f0 100%)",
    },
    {
      id: "light",
      label: "Snow Blue",
      description: "พื้นหลังสีขาว ปุ่มโทนฟ้า และการ์ดสีขาว สำหรับหน้าร้านที่ดูสะอาดและสว่าง",
      preview: "linear-gradient(135deg, #ffffff 0%, #dcedff 40%, #2b8cff 100%)",
    },
    {
      id: "dark",
      label: "Midnight Gold",
      description: "พื้นหลังสีดำ ปุ่มโทนเหลือง และการ์ดสีดำ ให้ภาพรวมคมเข้มและเด่นชัด",
      preview: "linear-gradient(135deg, #0f0f0f 0%, #1c1c1c 42%, #f4c430 100%)",
    },
  ];

export const promptPayRecipientOptions: Array<{ value: PromptPayRecipientType; label: string; helper: string }> = [
  { value: "MOBILE", label: "เบอร์พร้อมเพย์", helper: "เบอร์มือถือ 10 หลัก" },
  { value: "NATIONAL_ID", label: "เลขบัตรประชาชน", helper: "เลข 13 หลัก" },
  { value: "TAX_ID", label: "เลขผู้เสียภาษี", helper: "เลข 13 หลักของกิจการ" },
  { value: "STATIC_QR", label: "Static QR", helper: "อัปโหลด QR ธนาคาร" },
  { value: "BANK_ACCOUNT", label: "บัญชีธนาคาร", helper: "fallback เมื่อไม่มี QR" },
];

export const thaiBankOptions = [
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

// ── Style Classes ────────────────────────────────────────────────────────────

export const inputClass =
  "h-[46px] w-full rounded-[10px] border border-[rgba(100,120,160,0.22)] bg-[var(--field-bg)] px-[14px] text-[var(--foreground)] outline-none transition placeholder:text-[var(--field-placeholder)] focus:border-[var(--brand-strong)] focus:shadow-[0_0_0_4px_var(--ring)] disabled:cursor-not-allowed disabled:opacity-[0.62]";

export const primaryButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-transparent bg-[linear-gradient(135deg,var(--brand)_0%,var(--brand-strong)_100%)] px-[18px] font-bold text-[var(--button-text)] shadow-[var(--brand-shadow)_0_6px_14px] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62]";

export const activeGhostButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[rgba(0,0,0,0.15)_0_5px_10px] disabled:cursor-not-allowed disabled:text-[var(--foreground-soft)] disabled:opacity-[0.62]";

export const dangerGhostButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[rgba(232,93,117,0.3)] bg-[rgba(232,93,117,0.08)] px-[18px] font-bold text-[#ff8fa2] transition hover:-translate-y-px hover:border-[rgba(232,93,117,0.5)] hover:bg-[rgba(232,93,117,0.14)] disabled:cursor-not-allowed disabled:opacity-[0.62]";

export const fieldLabelClass = "text-[0.9rem] font-semibold text-[var(--foreground-soft)]";

export const compactBankInputClass =
  "h-[40px] w-full rounded-[10px] border border-[rgba(100,120,160,0.22)] bg-[var(--field-bg)] px-3 text-[0.95rem] text-[var(--foreground)] outline-none transition placeholder:text-[var(--field-placeholder)] focus:border-[var(--brand-strong)] focus:shadow-[0_0_0_4px_var(--ring)] disabled:cursor-not-allowed disabled:opacity-[0.62]";

export const compactFooterGhostButtonClass =
  "inline-flex min-h-[36px] items-center justify-center gap-[8px] rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-[14px] text-[0.92rem] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[rgba(0,0,0,0.15)_0_5px_10px] disabled:cursor-not-allowed disabled:text-[var(--foreground-soft)] disabled:opacity-[0.62]";

export const compactFooterPrimaryButtonClass =
  "inline-flex min-h-[36px] items-center justify-center gap-[8px] rounded-[10px] border border-transparent bg-[linear-gradient(135deg,var(--brand)_0%,var(--brand-strong)_100%)] px-[16px] text-[0.9rem] font-bold text-[var(--button-text)] shadow-[var(--brand-shadow)_0_6px_14px] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62]";

export const passwordInputWrapClass =
  "grid h-[46px] grid-cols-[minmax(0,1fr)_42px] items-center rounded-[10px] border border-[rgba(100,120,160,0.22)] bg-[var(--field-bg)] transition focus-within:border-[var(--brand-strong)] focus-within:shadow-[0_0_0_4px_var(--ring)]";

export const passwordInputClass =
  "h-full min-w-0 rounded-l-[10px] border-0 bg-transparent px-[14px] text-[var(--foreground)] outline-none placeholder:text-[#556070] disabled:cursor-not-allowed disabled:opacity-[0.62]";

export const passwordToggleClass =
  "inline-flex h-full w-[42px] items-center justify-center rounded-r-[10px] text-[var(--foreground-soft)] transition hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-[0.62]";

// ── Utility Functions ────────────────────────────────────────────────────────

export function isOwnerTheme(value: string | undefined | null): value is OwnerThemeId {
  return ownerThemeOptions.some((option) => option.id === value);
}

export function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์โลโก้หลังคร็อปได้"));
    reader.readAsDataURL(blob);
  });
}

export async function readApiMessage(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error || fallback;
}

export function normalizeDigitInput(value: string) {
  return value.replace(/[\s-]/g, "");
}
