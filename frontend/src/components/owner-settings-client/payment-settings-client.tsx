"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
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
import { fetchWithCsrfRetry } from "@/lib/csrf";
import type {
  OwnerPaymentSettingsValue,
  PromptPayDrafts,
  PromptPayRecipientType,
  SubmitState,
} from "./shared";
import {
  maxPaymentQrFileSize,
  paymentQrFileTypes,
  readApiMessage,
} from "./shared";
import { PaymentSettingsConfirmSaveModal } from "./payment-settings-confirm-save-modal";
import { PaymentSettingsFormFields } from "./payment-settings-form-fields";
import {
  clearPaymentSettingsForType,
  createPromptPayDrafts,
  isEditorTypeCleared,
  normalizePaymentSettings,
  paymentSettingsEqual,
  preparePaymentSettingsForSubmit,
  promptPayIdFieldCopy,
  resolveEditorType,
  validatePaymentSettings,
} from "./payment-settings-helpers";
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
        throw new Error("ยังไม่สามารถเตรียมรูป QR ได้ กรุณาลองอีกครั้ง");
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
      const response = await fetchWithCsrfRetry("/api/auth/owner-payment-settings", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
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

  const confirmSaveModal = (
    <PaymentSettingsConfirmSaveModal
      busy={submitState.status === "saving"}
      open={confirmSaveOpen}
      submitAutoEnabled={submitAutoEnabled}
      submitPreviewSettings={submitPreviewSettings}
      onClose={() => setConfirmSaveOpen(false)}
      onConfirm={(forceEnable) => {
        if (forceEnable) {
          performSubmit({ ...form, promptPayEnabled: true }, true);
        } else {
          performSubmit();
        }
      }}
    />
  );

  return (
    <form className="mt-2" onSubmit={handleSubmit}>
      <PaymentSettingsFormFields
        form={form}
        setForm={setForm}
        savedSettings={savedSettings}
        setEditorType={setEditorType}
        setPromptPayDrafts={setPromptPayDrafts}
        setSubmitState={setSubmitState}
        setConfirmSaveOpen={setConfirmSaveOpen}
        setBankDropdownOpen={setBankDropdownOpen}
        editorType={editorType}
        effectivelyDisabled={effectivelyDisabled}
        pending={pending}
        promptPayDrafts={promptPayDrafts}
        promptPayField={promptPayField}
        activePromptPayValue={activePromptPayValue}
        usesPromptPayId={usesPromptPayId}
        usesBankAccount={usesBankAccount}
        usesStaticQr={usesStaticQr}
        bankDropdownRef={bankDropdownRef}
        bankDropdownOpen={bankDropdownOpen}
        uploadingQr={uploadingQr}
        handleQrUpload={handleQrUpload}
        submitState={submitState}
        paymentHintMessage={paymentHintMessage}
        resetDisabled={resetDisabled}
        isActiveTabDirty={isActiveTabDirty}
        canSavePaymentSettings={canSavePaymentSettings}
        setShellAlert={setShellAlert}
        performSubmit={performSubmit}
      />
      {qrCropModal}
      {confirmSaveModal}
    </form>
  );
}
