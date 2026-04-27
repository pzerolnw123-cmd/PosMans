"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
import type {
  ConfirmPaymentSettingsModalProps,
  OwnerPaymentSettingsValue,
  PromptPayDrafts,
  PromptPayRecipientType,
  SubmitState,
} from "./shared";
import {
  activeGhostButtonClass,
  compactBankInputClass,
  compactFooterGhostButtonClass,
  compactFooterPrimaryButtonClass,
  dangerGhostButtonClass,
  fieldLabelClass,
  inputClass,
  maxPaymentQrFileSize,
  normalizeDigitInput,
  paymentQrFileTypes,
  primaryButtonClass,
  promptPayRecipientOptions,
  readApiMessage,
  thaiBankOptions,
} from "./shared";

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
    <div className="fixed inset-0 z-[300] grid place-items-center bg-[var(--modal-backdrop)] p-4 backdrop-blur-[16px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--brand-soft),transparent_48%)]" />

      <div className="relative z-[1] grid w-[calc(100vw-32px)] max-w-[380px] gap-5 overflow-hidden rounded-none border border-[var(--border)] bg-[var(--modal-surface)] p-5 shadow-[var(--modal-shadow)] max-[640px]:gap-4 max-[640px]:p-4">
        <div className="grid gap-3">
          <p className="m-0 text-left text-[0.7rem] font-bold uppercase tracking-[0.28em] text-[var(--brand-strong)]">ยืนยันการบันทึก</p>
          <h2 className="m-0 text-[1.25rem] leading-tight tracking-[-0.04em] text-[var(--foreground)]">ต้องการบันทึกการตั้งค่านี้ใช่ไหม</h2>
          <div className="inline-grid w-full gap-2 rounded-none border border-[var(--border)] bg-[var(--panel-subtle)] p-3">
            <div className="grid gap-1">
              <span className="text-[0.78rem] text-[var(--foreground-soft)]">{enabled ? "ประเภทผู้รับเงิน" : "สถานะระบบ"}</span>
              <strong className="text-[var(--foreground)] text-[0.95rem]">{enabled ? recipientLabel : "ปิดใช้งานและซ่อนจากหน้าร้าน (Offline)"}</strong>
            </div>
            {promptPaySummary ? (
              <div className="grid gap-1 border-t border-[rgba(100,120,160,0.14)] pt-2">
                <span className="text-[0.78rem] text-[var(--foreground-soft)]">PromptPay {!enabled ? <span className="text-[var(--accent-text)]">(บันทึกแบบรอเปิดใช้)</span> : null}</span>
                <div className={`text-[0.95rem] ${enabled ? "text-[var(--foreground)]" : "text-[var(--foreground-soft)]"}`}>{promptPaySummary}</div>
              </div>
            ) : null}
            {bankSummary ? (
              <div className="grid gap-1 border-t border-[rgba(100,120,160,0.14)] pt-2">
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
      recipientLabel={`${promptPayRecipientOptions.find((option) => option.value === submitPreviewSettings.promptPayRecipientType)?.label || "-"}${submitPreviewSettings.bankName && submitPreviewSettings.bankAccountNumber && submitPreviewSettings.promptPayRecipientType !== "BANK_ACCOUNT" ? " และ โอนเงินธนาคาร" : ""
        }`}
      promptPaySummary={
        submitPreviewSettings.promptPayMobileId
          ? (
            <strong className="text-[1.02rem] font-bold tracking-[0.01em] text-[var(--foreground)]">
              เบอร์พร้อมเพย์ <span className="text-[1.08rem] font-extrabold text-[#f3edff]">{submitPreviewSettings.promptPayMobileId}</span>
            </strong>
          )
          : submitPreviewSettings.promptPayNationalId
            ? (
              <strong className="text-[1.02rem] font-bold tracking-[0.01em] text-[var(--foreground)]">
                เลขบัตรประชาชน <span className="text-[1.08rem] font-extrabold text-[#f3edff]">{submitPreviewSettings.promptPayNationalId}</span>
              </strong>
            )
            : submitPreviewSettings.promptPayTaxId
              ? (
                <strong className="text-[1.02rem] font-bold tracking-[0.01em] text-[var(--foreground)]">
                  เลขผู้เสียภาษี <span className="text-[1.08rem] font-extrabold text-[#f3edff]">{submitPreviewSettings.promptPayTaxId}</span>
                </strong>
              )
              : null
      }
      bankSummary={
        submitPreviewSettings.bankName && submitPreviewSettings.bankAccountNumber ? (
          <strong className="text-[1.02rem] font-bold tracking-[0.01em] text-[var(--foreground)]">
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
      <div className="grid gap-2.5">
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--field-bg)] px-3 py-2 max-[640px]:flex-col max-[640px]:items-start">
          <span className="grid min-w-0 gap-1">
            <span className="truncate text-[0.95rem] font-bold leading-[1.45] text-[var(--foreground)]">เปิดใช้ QR / ข้อมูลโอน</span>
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

                  if (isChecked) {
                    // They want to turn ON the CURRENT tab. Validate the CURRENT form so they get the correct error message.
                    const testFormAsEnabled = { ...form, promptPayEnabled: true };
                    const testPrepared = preparePaymentSettingsForSubmit(testFormAsEnabled, editorType, savedSettings.promptPayEnabled);
                    const testBankIncomplete = editorType === "BANK_ACCOUNT" && Boolean(testFormAsEnabled.bankName || testFormAsEnabled.bankAccountName || testFormAsEnabled.bankAccountNumber) && !(testFormAsEnabled.bankName && testFormAsEnabled.bankAccountName && testFormAsEnabled.bankAccountNumber);
                    const validationError = testBankIncomplete ? "กรอกข้อมูลบัญชีธนาคารให้ครบก่อนเปิดใช้งาน" : validatePaymentSettings(testPrepared, editorType);

                    if (validationError) {
                      setShellAlert({ message: validationError, tone: "danger" });
                      return; // Immediately snap the controlled switch back to OFF! 
                    }

                    const nextForm = { ...form, promptPayEnabled: true };
                    setForm(nextForm);
                    await performSubmit(nextForm);
                  } else {
                    // They want to turn OFF. Since there are no unsaved changes, they just want to disable the feature.
                    // Use savedSettings to prevent wiping their data if they happened to click an empty tab before toggling.
                    const nextForm = { ...savedSettings, promptPayEnabled: false };

                    setEditorType(savedSettings.promptPayRecipientType);
                    setForm(nextForm);
                    setPromptPayDrafts(createPromptPayDrafts(nextForm));
                    await performSubmit(nextForm);
                  }
                }}
                disabled={pending}
                aria-label={form.promptPayEnabled ? "ปิดใช้ QR และข้อมูลโอนในหน้า Payment" : "เปิดใช้ QR และข้อมูลโอนในหน้า Payment"}
              />
              <label htmlFor="owner-payment-settings-toggle" />
            </span>
          </span>
        </div>

        <div className="grid gap-2">
          <span className={fieldLabelClass}>ประเภทผู้รับเงิน</span>
          <span className="text-[0.78rem] leading-[1.2] text-[var(--foreground-soft)]">คุณสามารถกรอกเบอร์พร้อมเพย์, เลขบัตรประชาชน, เลขผู้เสียภาษี, หรือรูป QR พร้อมกับข้อมูลบัญชีธนาคารได้</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {promptPayRecipientOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  editorType === option.value
                    ? `grid min-h-[46px] content-center gap-0.5 rounded-[10px] border px-3 py-1 text-left text-[var(--foreground)] transition-colors ${option.value === "BANK_ACCOUNT"
                      ? "border-[rgba(232,93,117,0.52)] bg-[rgba(232,93,117,0.14)] text-[#ffb0bd]"
                      : "border-[var(--accent-border)] bg-[var(--accent-surface)]"
                    } ${option.value === "BANK_ACCOUNT" ? "col-span-1 sm:col-span-2 mx-auto w-full sm:max-w-[calc(50%_-_2px)] justify-items-center text-center" : ""}`
                    : option.value === "BANK_ACCOUNT"
                      ? "col-span-1 sm:col-span-2 mx-auto grid min-h-[46px] w-full sm:max-w-[calc(50%_-_2px)] content-center justify-items-center gap-0.5 rounded-[10px] border border-[rgba(232,93,117,0.34)] bg-[rgba(232,93,117,0.08)] px-3 py-1 text-center text-[#ff9daf] transition hover:border-[rgba(232,93,117,0.5)] hover:bg-[rgba(232,93,117,0.12)]"
                      : "grid min-h-[46px] content-center gap-0.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-left text-[var(--foreground)] transition hover:border-[var(--border-strong)]"
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
          <div className="grid gap-2.5">
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
                  className={`${compactBankInputClass} flex items-center justify-between gap-3 text-left ${bankDropdownOpen ? "border-[var(--brand-strong)] shadow-[0_0_0_4px_var(--ring)]" : ""}`}
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
                  <div className="absolute bottom-[calc(100%+10px)] left-0 right-0 z-20 overflow-hidden border border-[var(--border-strong)] bg-[var(--panel-elevated)] shadow-[var(--shadow-card)] max-[640px]:bottom-auto max-[640px]:top-[calc(100%+10px)]">
                    <div className="max-h-[240px] overflow-y-auto py-2 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-[var(--scroll-track)] [&::-webkit-scrollbar-thumb]:[background:var(--scroll-thumb)] hover:[&::-webkit-scrollbar-thumb]:[background:var(--scroll-thumb-hover)]">
                      {thaiBankOptions.map((bankName) => {
                        const active = form.bankName === bankName;

                        return (
                          <button
                            key={bankName}
                            type="button"
                            className={`flex w-full items-center px-4 py-3 text-left text-[0.95rem] leading-[1.25] transition ${active ? "bg-[var(--accent-surface)] text-[var(--accent-text)]" : "text-[var(--foreground)] hover:bg-[var(--panel-subtle)]"}`}
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
          <div className="grid gap-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--field-bg)] p-3">
            <div className="flex items-center justify-between gap-3 max-[640px]:flex-col max-[640px]:items-stretch">
              <div className="min-w-0">
                <strong className="block text-[0.95rem] leading-[1.3] text-[var(--foreground)]">Static QR</strong>
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

      <div className="mt-3 flex flex-wrap justify-start gap-3 max-[900px]:[&>*]:w-full">
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

