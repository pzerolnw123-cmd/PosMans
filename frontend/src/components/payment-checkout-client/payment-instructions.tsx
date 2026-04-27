import { formatBaht, promptPayRecipientOptionsLabel } from "./shared";
import type { OwnerPaymentSettingsValue } from "@/components/owner-settings-client";

export type PaymentInstructionsProps = {
  compact?: boolean;
  qrPaymentSelected: boolean;
  transferSelected: boolean;
  completedSale: boolean;
  billTotal: number;
  paymentSettings: OwnerPaymentSettingsValue;
  dynamicPromptPayReady: boolean;
  staticQrReady: boolean;
  promptPayQrDataUrl: string;
  bankInfoFilled: boolean;
};

export function QrPaymentInstructions({
  compact = false,
  qrPaymentSelected,
  completedSale,
  billTotal,
  paymentSettings,
  dynamicPromptPayReady,
  staticQrReady,
  promptPayQrDataUrl,
}: Omit<PaymentInstructionsProps, "transferSelected" | "bankInfoFilled">) {
  if (!qrPaymentSelected) {
    return null;
  }

  const wrapperClass = compact ? "grid content-start justify-items-center gap-4" : "grid gap-3 rounded-none border border-[rgba(100,120,160,0.16)] bg-[rgba(255,255,255,0.03)] p-4";

  return (
    <div className={wrapperClass}>
      {!compact ? (
        <div className="flex items-start justify-between gap-3 max-[860px]:flex-col">
          <div>
            <strong className="block text-[var(--foreground)]">QR PromptPay / โอนเงิน</strong>
            <span className="text-[0.86rem] leading-[1.5] text-[var(--foreground-soft)]">
              {completedSale ? "วิธีรับเงินของบิลล่าสุด" : "ให้ลูกค้าสแกนหรือโอน แล้วตรวจสลิปก่อนกดยืนยัน"}
            </span>
          </div>
          <strong className="whitespace-nowrap text-[var(--foreground)]">{formatBaht(billTotal)}</strong>
        </div>
      ) : null}

      {!paymentSettings.promptPayEnabled ? (
        <div className="border border-[rgba(232,93,117,0.28)] bg-[rgba(232,93,117,0.08)] px-3 py-2 text-[0.86rem] font-bold text-[#ff8fa2]">
          ยังไม่ได้เปิดใช้ QR PromptPay <br />ในหน้าตั้งค่า
        </div>
      ) : dynamicPromptPayReady ? (
        <div className={compact ? "grid justify-items-center gap-4 text-center" : "grid grid-cols-[148px_minmax(0,1fr)] items-center gap-4 max-[860px]:grid-cols-1"}>
          {promptPayQrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={promptPayQrDataUrl} alt="PromptPay QR" className={compact ? "aspect-square w-full max-w-[240px] rounded-none bg-white p-3 shadow-[var(--brand-shadow)_0_0_24px]" : "h-[148px] w-[148px] rounded-none border border-[var(--accent-border)] bg-white p-2 shadow-[var(--brand-shadow)_0_0_15px]"} />
          ) : (
            <div className={compact ? "grid aspect-square w-full max-w-[240px] place-items-center rounded-none border border-dashed border-[var(--accent-border)] text-center text-[0.86rem] text-[var(--foreground-soft)]" : "grid h-[148px] w-[148px] place-items-center rounded-none border border-dashed border-[var(--accent-border)] text-center text-[0.82rem] text-[var(--foreground-soft)]"}>
              กำลังสร้าง QR
            </div>
          )}
          <div className={compact ? "grid w-full max-w-[240px] gap-3 text-[0.9rem] leading-[1.45] text-[rgba(229,223,255,0.78)]" : "grid gap-2 text-[0.9rem] text-[var(--foreground-soft)]"}>
            {compact ? (
              <div className="flex items-start justify-between gap-4 text-left max-[520px]:flex-col">
                <div className="grid min-w-0 gap-1.5">
                  <strong className="block leading-[1.28] text-[var(--foreground)]">QR PromptPay / โอนเงิน</strong>
                  <span className="text-[0.78rem] leading-[1.55] text-[var(--foreground-soft)]">ยอดถูกฝังใน QR แล้ว</span>
                </div>
                <strong className="whitespace-nowrap text-[var(--foreground)]">{formatBaht(billTotal)}</strong>
              </div>
            ) : (
              <>
                <span>ประเภท: {promptPayRecipientOptionsLabel(paymentSettings.promptPayRecipientType)}</span>
                <span>ยอดถูกฝังใน QR แล้ว</span>
              </>
            )}
            <span className="block pt-1 text-center font-bold leading-[1.35] text-[#ffcf7a]">ตรวจสลิปก่อนยืนยัน</span>
          </div>
        </div>
      ) : staticQrReady ? (
        <div className={compact ? "grid justify-items-center gap-4 text-center" : "grid grid-cols-[148px_minmax(0,1fr)] items-center gap-4 max-[860px]:grid-cols-1"}>
          <span className={compact ? "aspect-square w-full max-w-[240px] bg-cover bg-center bg-white" : "h-[148px] w-[148px] rounded-[12px] border border-white/10 bg-cover bg-center bg-white"} style={{ backgroundImage: `url(${paymentSettings.paymentQrImageUrl})` }} />
          <div className={compact ? "grid w-full max-w-[240px] gap-3 text-[0.9rem] leading-[1.45] text-[rgba(229,223,255,0.78)]" : "grid gap-2 text-[0.9rem] text-[var(--foreground-soft)]"}>
            {compact ? (
              <div className="flex items-start justify-between gap-4 text-left max-[520px]:flex-col">
                <div className="grid min-w-0 gap-1.5">
                  <strong className="block leading-[1.28] text-[var(--foreground)]">Static QR จากธนาคาร</strong>
                  <span className="text-[0.78rem] leading-[1.55] text-[var(--foreground-soft)]">ให้ลูกค้าโอนยอดนี้</span>
                </div>
                <strong className="whitespace-nowrap text-[var(--foreground)]">{formatBaht(billTotal)}</strong>
              </div>
            ) : (
              <>
                <span>Static QR จากธนาคาร</span>
                <span>ให้ลูกค้าโอน {formatBaht(billTotal)}</span>
              </>
            )}
            <span className="block pt-1 text-center font-bold leading-[1.35] text-[#ffcf7a]">ตรวจสลิปก่อนยืนยัน</span>
          </div>
        </div>
      ) : (
        <div className="rounded-[10px] border border-[rgba(232,93,117,0.28)] bg-[rgba(232,93,117,0.08)] px-3 py-2 text-[0.84rem] font-bold text-[#ff8fa2]">
          ตั้งค่ารับเงินยังไม่ครบ
        </div>
      )}
    </div>
  );
}

export function TransferInstructions({
  compact = false,
  transferSelected,
  completedSale,
  billTotal,
  paymentSettings,
  bankInfoFilled,
}: Omit<PaymentInstructionsProps, "qrPaymentSelected" | "dynamicPromptPayReady" | "staticQrReady" | "promptPayQrDataUrl">) {
  if (!transferSelected) {
    return null;
  }

  const wrapperClass = compact ? "grid content-start gap-3" : "grid gap-3 rounded-none border border-[rgba(100,120,160,0.16)] bg-[rgba(255,255,255,0.03)] p-4";

  return (
    <div className={wrapperClass}>
      {!compact ? (
        <div className="flex items-start justify-between gap-3 max-[860px]:flex-col">
          <div>
            <strong className="block text-[var(--foreground)]">ข้อมูลโอนเงินผ่านธนาคาร</strong>
            <span className="text-[0.86rem] leading-[1.5] text-[var(--foreground-soft)]">ให้ลูกค้าโอนเข้าบัญชีด้านล่าง</span>
          </div>
          <strong className="whitespace-nowrap text-[var(--foreground)]">{formatBaht(billTotal)}</strong>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 max-[520px]:flex-col max-[520px]:items-start">
          <strong className="text-[0.95rem] text-[var(--foreground)]">ยอดโอน {formatBaht(billTotal)}</strong>
          <span className="text-[0.75rem] font-bold text-[#ffcf7a]">ตรวจสลิปหลังโอน</span>
        </div>
      )}

      {!paymentSettings.promptPayEnabled ? (
        <div className="border border-[rgba(232,93,117,0.28)] bg-[rgba(232,93,117,0.08)] px-3 py-2 text-[0.84rem] font-bold text-[#ff8fa2]">
          ยังไม่ได้เปิดใช้การรับโอนเงิน <br />ในหน้าตั้งค่า
        </div>
      ) : bankInfoFilled ? (
        <div className="grid gap-2 rounded-none border border-[rgba(100,120,160,0.14)] bg-[var(--field-bg)] px-3.5 py-3 text-[0.86rem]">
          <div className="flex justify-between gap-3"><span className="text-[var(--foreground-soft)]">ธนาคาร</span><strong className="text-[var(--foreground)]">{paymentSettings.bankName}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-[var(--foreground-soft)]">ชื่อบัญชี</span><strong className="text-[var(--foreground)]">{paymentSettings.bankAccountName}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-[var(--foreground-soft)] text-left">เลขบัญชี</span><strong className="text-[1.05rem] text-[var(--brand-strong)] select-all">{paymentSettings.bankAccountNumber}</strong></div>
        </div>
      ) : (
        <div className="border border-[rgba(232,93,117,0.28)] bg-[rgba(232,93,117,0.08)] px-3 py-2 text-[0.84rem] font-bold text-[#ff8fa2]">
          ยังไม่ได้ตั้งค่าบัญชีธนาคาร
        </div>
      )}
    </div>
  );
}
