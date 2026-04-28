import type { OwnerPaymentSettingsValue, PromptPayDrafts, PromptPayRecipientType } from "./shared";
import { normalizeDigitInput } from "./shared";

export function normalizePaymentSettings(value: OwnerPaymentSettingsValue): OwnerPaymentSettingsValue {
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

export function paymentSettingsEqual(left: OwnerPaymentSettingsValue, right: OwnerPaymentSettingsValue) {
  const normalizedLeft = normalizePaymentSettings(left);
  const normalizedRight = normalizePaymentSettings(right);

  // The user explicitly desires the ability to draft PromptPay data while the switch is OFF.
  // Therefore, we must evaluate the entire configuration for equality to detect their offline edits.
  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
}

export function validatePaymentSettings(value: OwnerPaymentSettingsValue, editorType: PromptPayRecipientType) {
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

export function isEditorTypeCleared(settings: OwnerPaymentSettingsValue, editorType: PromptPayRecipientType) {
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

export function preparePaymentSettingsForSubmit(
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

export function promptPayIdFieldCopy(type: PromptPayRecipientType) {
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

export function createPromptPayDrafts(settings: OwnerPaymentSettingsValue): PromptPayDrafts {
  return {
    MOBILE: settings.promptPayMobileId || (settings.promptPayRecipientType === "MOBILE" ? settings.promptPayId : ""),
    NATIONAL_ID: settings.promptPayNationalId || (settings.promptPayRecipientType === "NATIONAL_ID" ? settings.promptPayId : ""),
    TAX_ID: settings.promptPayTaxId || (settings.promptPayRecipientType === "TAX_ID" ? settings.promptPayId : ""),
  };
}

export function clearPaymentSettingsForType(settings: OwnerPaymentSettingsValue, type: PromptPayRecipientType): OwnerPaymentSettingsValue {
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

export function resolveEditorType(settings: OwnerPaymentSettingsValue): PromptPayRecipientType {
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
