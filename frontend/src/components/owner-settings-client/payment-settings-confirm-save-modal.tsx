"use client";

import type { OwnerPaymentSettingsValue } from "./shared";
import { promptPayRecipientOptions } from "./shared";
import { ConfirmPaymentSettingsModal } from "./payment-settings-confirm-modal";

type PaymentSettingsConfirmSaveModalProps = {
  busy: boolean;
  open: boolean;
  submitAutoEnabled: boolean;
  submitPreviewSettings: OwnerPaymentSettingsValue;
  onClose: () => void;
  onConfirm: (forceEnable: boolean) => void;
};

export function PaymentSettingsConfirmSaveModal({
  busy,
  open,
  submitAutoEnabled,
  submitPreviewSettings,
  onClose,
  onConfirm,
}: PaymentSettingsConfirmSaveModalProps) {
  if (!open) {
    return null;
  }

  return (
    <ConfirmPaymentSettingsModal
      busy={busy}
      enabled={submitPreviewSettings.promptPayEnabled}
      autoEnabled={submitAutoEnabled}
      recipientLabel={`${promptPayRecipientOptions.find((option) => option.value === submitPreviewSettings.promptPayRecipientType)?.label || "-"}${submitPreviewSettings.bankName && submitPreviewSettings.bankAccountNumber && submitPreviewSettings.promptPayRecipientType !== "BANK_ACCOUNT" ? " และ โอนเงินธนาคาร" : ""}`}
      promptPaySummary={
        submitPreviewSettings.promptPayMobileId ? (
          <strong className="text-[1.02rem] font-bold tracking-[0.01em] text-[var(--foreground)]">
            เบอร์พร้อมเพย์ <span className="text-[1.08rem] font-extrabold text-[var(--foreground)]">{submitPreviewSettings.promptPayMobileId}</span>
          </strong>
        ) : submitPreviewSettings.promptPayNationalId ? (
          <strong className="text-[1.02rem] font-bold tracking-[0.01em] text-[var(--foreground)]">
            เลขบัตรประชาชน <span className="text-[1.08rem] font-extrabold text-[var(--foreground)]">{submitPreviewSettings.promptPayNationalId}</span>
          </strong>
        ) : submitPreviewSettings.promptPayTaxId ? (
          <strong className="text-[1.02rem] font-bold tracking-[0.01em] text-[var(--foreground)]">
            เลขผู้เสียภาษี <span className="text-[1.08rem] font-extrabold text-[var(--foreground)]">{submitPreviewSettings.promptPayTaxId}</span>
          </strong>
        ) : null
      }
      bankSummary={
        submitPreviewSettings.bankName && submitPreviewSettings.bankAccountNumber ? (
          <strong className="text-[1.02rem] font-bold tracking-[0.01em] text-[var(--foreground)]">
            {submitPreviewSettings.bankName} • <span className="text-[1.08rem] font-extrabold text-[var(--foreground)]">{submitPreviewSettings.bankAccountNumber}</span>
          </strong>
        ) : null
      }
      onClose={onClose}
      onConfirm={() => onConfirm(submitAutoEnabled)}
    />
  );
}
