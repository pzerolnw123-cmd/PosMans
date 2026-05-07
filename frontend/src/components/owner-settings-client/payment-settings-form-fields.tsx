"use client";

import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from "react";
import type { OwnerPaymentSettingsValue, PromptPayDrafts, PromptPayRecipientType, SubmitState } from "./shared";
import {
  activeGhostButtonClass,
  compactBankInputClass,
  compactFooterGhostButtonClass,
  compactFooterPrimaryButtonClass,
  dangerGhostButtonClass,
  fieldLabelClass,
  inputClass,
  normalizeDigitInput,
  promptPayRecipientOptions,
  thaiBankOptions,
} from "./shared";
import {
  clearPaymentSettingsForType,
  createPromptPayDrafts,
  preparePaymentSettingsForSubmit,
  validatePaymentSettings,
} from "./payment-settings-helpers";

type ShellAlert = { message: string; tone: "success" | "danger" | "info" };

const posWideShortRecipientOptionClass =
  "[@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:!flex [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:!min-h-[34px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:!items-center [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:!justify-center [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:!gap-1.5 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:!px-3 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:!py-1 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:!text-center";
const posWideShortRecipientLabelClass =
  "[@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:!whitespace-nowrap [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:!text-[0.76rem]";
const posWideShortRecipientHelperClass =
  "[@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:!hidden";

type PaymentSettingsFormFieldsProps = {
  form: OwnerPaymentSettingsValue;
  setForm: Dispatch<SetStateAction<OwnerPaymentSettingsValue>>;
  savedSettings: OwnerPaymentSettingsValue;
  setEditorType: Dispatch<SetStateAction<PromptPayRecipientType>>;
  setPromptPayDrafts: Dispatch<SetStateAction<PromptPayDrafts>>;
  setSubmitState: Dispatch<SetStateAction<SubmitState>>;
  setConfirmSaveOpen: Dispatch<SetStateAction<boolean>>;
  setBankDropdownOpen: Dispatch<SetStateAction<boolean>>;
  editorType: PromptPayRecipientType;
  effectivelyDisabled: boolean;
  pending: boolean;
  promptPayDrafts: PromptPayDrafts;
  promptPayField: { label: string; placeholder: string; maxLength: number };
  activePromptPayValue: string;
  usesPromptPayId: boolean;
  usesBankAccount: boolean;
  usesStaticQr: boolean;
  bankDropdownRef: RefObject<HTMLDivElement | null>;
  bankDropdownOpen: boolean;
  uploadingQr: boolean;
  handleQrUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  submitState: SubmitState;
  paymentHintMessage: string;
  resetDisabled: boolean;
  isActiveTabDirty: boolean;
  canSavePaymentSettings: boolean;
  setShellAlert: (alert: ShellAlert) => void;
  performSubmit: (overrideSettings?: OwnerPaymentSettingsValue, forceEnable?: boolean) => Promise<boolean>;
};

export function PaymentSettingsFormFields({
  form,
  setForm,
  savedSettings,
  setEditorType,
  setPromptPayDrafts,
  setSubmitState,
  setConfirmSaveOpen,
  setBankDropdownOpen,
  editorType,
  effectivelyDisabled,
  pending,
  promptPayDrafts,
  promptPayField,
  activePromptPayValue,
  usesPromptPayId,
  usesBankAccount,
  usesStaticQr,
  bankDropdownRef,
  bankDropdownOpen,
  uploadingQr,
  handleQrUpload,
  submitState,
  paymentHintMessage,
  resetDisabled,
  isActiveTabDirty,
  canSavePaymentSettings,
  setShellAlert,
  performSubmit,
}: PaymentSettingsFormFieldsProps) {
  return (
    <>
      <div className="grid gap-2.5">
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--field-bg)] px-3 py-2 max-[640px]:flex-col max-[640px]:items-start">
          <span className="grid min-w-0 gap-1">
            <span className="truncate text-[0.95rem] font-bold leading-[1.45] text-[var(--foreground)]">
              <span className="[@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:hidden [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:hidden [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:hidden">
                เปิดใช้ QR / ข้อมูลโอน
              </span>
              <span className="hidden [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:inline [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:inline [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:inline">
                เปิด / ปิด ใช้ QR
              </span>
            </span>
            <span className="text-[0.8rem] leading-[1.45] text-[var(--foreground-soft)] max-[640px]:text-[0.78rem]">
              <span className="[@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:hidden [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:hidden [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:hidden">
                แสดงใน Payment และเช็กสลิป
              </span>
              <span className="hidden [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:inline [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:inline [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:inline">
                แสดงใน Payment
              </span>
            </span>
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
          <span className="text-[0.78rem] leading-[1.2] text-[var(--foreground-soft)] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:hidden [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:hidden [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:hidden">
            คุณสามารถกรอกเบอร์พร้อมเพย์, เลขบัตรประชาชน, เลขผู้เสียภาษี, หรือรูป QR พร้อมกับข้อมูลบัญชีธนาคารได้
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {promptPayRecipientOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  editorType === option.value
                    ? `grid min-h-[46px] content-center gap-0.5 rounded-[10px] border px-3 py-1 text-left text-[var(--foreground)] transition-colors ${posWideShortRecipientOptionClass} ${option.value === "BANK_ACCOUNT"
                      ? "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-bright)]"
                      : "border-[var(--accent-border)] bg-[var(--accent-surface)]"
                    } ${option.value === "BANK_ACCOUNT" ? "col-span-1 sm:col-span-2 mx-auto w-full sm:max-w-[calc(50%_-_2px)] justify-items-center text-center" : ""}`
                    : option.value === "BANK_ACCOUNT"
                      ? `col-span-1 sm:col-span-2 mx-auto grid min-h-[46px] w-full sm:max-w-[calc(50%_-_2px)] content-center justify-items-center gap-0.5 rounded-[10px] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-1 text-center text-[var(--danger-bright)] transition hover:border-[var(--danger-border)] hover:bg-[var(--danger-soft)] ${posWideShortRecipientOptionClass}`
                      : `grid min-h-[46px] content-center gap-0.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-left text-[var(--foreground)] transition hover:border-[var(--border-strong)] ${posWideShortRecipientOptionClass}`
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
                <strong className={`text-[0.86rem] leading-[1.2] [overflow-wrap:anywhere] ${posWideShortRecipientLabelClass}`}>{option.label}</strong>
                <span className={`text-[0.68rem] leading-[1.25] text-[var(--foreground-soft)] [overflow-wrap:anywhere] ${posWideShortRecipientHelperClass}`}>{option.helper}</span>
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
                  <span className={form.bankName ? "truncate text-[var(--foreground)]" : "truncate text-[var(--field-placeholder)]"}>{form.bankName || "เลือกธนาคาร"}</span>
                  <span className={`shrink-0 text-[var(--foreground-soft)] transition ${bankDropdownOpen ? "rotate-180" : ""}`}>
                    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
                      <path d="M5.47 7.97a.75.75 0 0 1 1.06 0L10 11.44l3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </span>
                </button>
                {bankDropdownOpen ? (
                  <div className="absolute bottom-[calc(100%+10px)] left-0 right-0 z-20 overflow-hidden border border-[var(--border-strong)] [background:var(--panel-elevated)] shadow-[var(--shadow-card)] max-[640px]:bottom-auto max-[640px]:top-[calc(100%+10px)]">
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
              <div className="flex items-center gap-2 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--overlay-white-03)] p-2 max-[520px]:grid max-[520px]:grid-cols-[44px_minmax(0,1fr)]">
                <span className="h-11 w-11 shrink-0 rounded-[8px] border border-[var(--border)] bg-cover bg-center" style={{ backgroundImage: `url(${form.paymentQrImageUrl})` }} />
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

      <div className="mt-3 flex flex-wrap justify-start gap-3 max-[900px]:[&>*]:w-full [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)]:grid [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)]:grid-cols-[minmax(0,1fr)_minmax(72px,1fr)_minmax(0,1fr)] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)]:[&>*]:!w-auto [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)]:[&>*]:whitespace-nowrap [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-cols-[minmax(0,1fr)_minmax(72px,1fr)_minmax(0,1fr)] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[&>*]:!w-auto [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[&>*]:whitespace-nowrap">
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
    </>
  );
}
