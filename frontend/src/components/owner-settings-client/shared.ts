import type { ReactNode } from "react";
import type { OwnerThemeId } from "@/lib/owner-theme";
export {
  defaultOwnerTheme,
  isOwnerTheme,
  ownerThemeStorageKey,
  type OwnerThemeId,
} from "@/lib/owner-theme";

// Types

export type SubmitState = {
  status: "idle" | "saving" | "success" | "error";
  message: string;
};

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

// Constants

export const logoFileTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
export const maxLogoFileSize = 2 * 1024 * 1024;
export const paymentQrFileTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
export const maxPaymentQrFileSize = 2 * 1024 * 1024;

export const ownerThemeOptions: Array<{
  id: OwnerThemeId;
  label: string;
  description: string;
  preview: string;
}> = [
    {
      id: "light",
      label: "Snow Blue",
      description: "พื้นหลังสีขาว ปุ่มโทนฟ้า และการ์ดสีขาว สำหรับหน้าร้านที่ดูสะอาดและสว่าง",
      preview: "var(--theme-preview-light)",
    },
    {
      id: "violet",
      label: "Midnight Violet",
      description: "โทนเข้ม คม และเน้น accent แบบม่วง สำหรับทีมที่ชอบหน้าจอ contrast สูง",
      preview: "var(--theme-preview-violet)",
    },
    {
      id: "dark",
      label: "Midnight Gold",
      description: "พื้นหลังสีดำ ปุ่มโทนเหลือง และการ์ดสีดำ ให้ภาพรวมคมเข้มและเด่นชัด",
      preview: "var(--theme-preview-dark)",
    },
    {
      id: "mono",
      label: "Ink Mono",
      description: "โทนขาวดำ เส้นกรอบคม เงาน้อย เหมาะกับหน้าร้านที่ต้องการฟีลเรียบจริงจัง",
      preview: "var(--theme-preview-mono)",
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
  "h-[46px] w-full rounded-[10px] border border-[var(--border-field)] bg-[var(--field-bg)] px-[14px] text-[var(--foreground)] outline-none transition placeholder:text-[var(--field-placeholder)] focus:border-[var(--brand-strong)] focus:shadow-[0_0_0_4px_var(--ring)] disabled:cursor-not-allowed disabled:opacity-[0.62]";

export const primaryButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-transparent [background:var(--brand-gradient)] px-[18px] font-bold text-[var(--button-text)] shadow-[var(--brand-shadow)_0_6px_14px] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62]";

export const activeGhostButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-hover)] disabled:cursor-not-allowed disabled:text-[var(--foreground-soft)] disabled:opacity-[0.62]";

export const dangerGhostButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-[18px] font-bold text-[var(--danger-bright)] transition hover:-translate-y-px hover:border-[var(--danger-border)] hover:bg-[var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-[0.62]";

export const fieldLabelClass = "text-[0.9rem] font-semibold text-[var(--foreground-soft)]";

export const compactBankInputClass =
  "h-[40px] w-full rounded-[10px] border border-[var(--border-field)] bg-[var(--field-bg)] px-3 text-[0.95rem] text-[var(--foreground)] outline-none transition placeholder:text-[var(--field-placeholder)] focus:border-[var(--brand-strong)] focus:shadow-[0_0_0_4px_var(--ring)] disabled:cursor-not-allowed disabled:opacity-[0.62]";

export const compactFooterGhostButtonClass =
  "inline-flex min-h-[36px] items-center justify-center gap-[8px] rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-[14px] text-[0.92rem] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-hover)] disabled:cursor-not-allowed disabled:text-[var(--foreground-soft)] disabled:opacity-[0.62]";

export const compactFooterPrimaryButtonClass =
  "inline-flex min-h-[36px] items-center justify-center gap-[8px] rounded-[10px] border border-transparent [background:var(--brand-gradient)] px-[16px] text-[0.9rem] font-bold text-[var(--button-text)] shadow-[var(--brand-shadow)_0_6px_14px] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62]";

export const passwordInputWrapClass =
  "grid h-[46px] grid-cols-[minmax(0,1fr)_42px] items-center rounded-[10px] border border-[var(--border-field)] bg-[var(--field-bg)] transition focus-within:border-[var(--brand-strong)] focus-within:shadow-[0_0_0_4px_var(--ring)]";

export const passwordInputClass =
  "h-full min-w-0 rounded-l-[10px] border-0 bg-transparent px-[14px] text-[var(--foreground)] outline-none placeholder:text-[var(--field-placeholder)] disabled:cursor-not-allowed disabled:opacity-[0.62]";

export const passwordToggleClass =
  "inline-flex h-full w-[42px] items-center justify-center rounded-r-[10px] text-[var(--foreground-soft)] transition hover:bg-[var(--overlay-white-04)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-[0.62]";

// ── Utility Functions ────────────────────────────────────────────────────────

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

