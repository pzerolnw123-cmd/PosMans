import { formatBaht, promptPayRecipientOptionsLabel } from "./shared";
import type { OwnerPaymentSettingsValue } from "@/components/owner-settings-client";
import { LoadingState } from "@/components/ui-primitives";

export type PaymentInstructionsProps = {
  compact?: boolean;
  hideCompactSummary?: boolean;
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

  const wrapperClass = compact ? "grid content-start justify-items-center gap-4" : "grid gap-3 rounded-none border border-[var(--border-muted)] bg-[var(--overlay-white-03)] p-4";

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
        <div className="border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-[0.86rem] font-bold text-[var(--danger-bright)]">
          ยังไม่ได้เปิดใช้ QR PromptPay <br />ในหน้าตั้งค่า
        </div>
      ) : dynamicPromptPayReady ? (
        <div className={compact ? "grid justify-items-center gap-4 text-center" : "grid grid-cols-[148px_minmax(0,1fr)] items-center gap-4 max-[860px]:grid-cols-1"}>
          {promptPayQrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={promptPayQrDataUrl} alt="PromptPay QR" className={compact ? "aspect-square w-full max-w-[240px] rounded-none bg-[var(--qr-background)] p-3 shadow-[var(--brand-shadow)_0_0_24px]" : "h-[148px] w-[148px] rounded-none border border-[var(--accent-border)] bg-[var(--qr-background)] p-2 shadow-[var(--brand-shadow)_0_0_15px]"} />
          ) : (
            <div className={compact ? "grid aspect-square w-full max-w-[240px] place-items-center rounded-none border border-dashed border-[var(--accent-border)] text-center text-[0.86rem] text-[var(--foreground-soft)]" : "grid h-[148px] w-[148px] place-items-center rounded-none border border-dashed border-[var(--accent-border)] text-center text-[0.82rem] text-[var(--foreground-soft)]"}>
              <LoadingState size={compact ? 44 : 32} label="กำลังสร้าง QR..." />
            </div>
          )}
          <div className={compact ? "grid w-full max-w-[240px] gap-3 text-[0.9rem] leading-[1.45] text-[var(--text-on-dark-muted)]" : "grid gap-2 text-[0.9rem] text-[var(--foreground-soft)]"}>
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
            <span className="block pt-1 text-center font-bold leading-[1.35] text-[var(--warning)]">ตรวจสลิปก่อนยืนยัน</span>
          </div>
        </div>
      ) : staticQrReady ? (
        <div className={compact ? "grid justify-items-center gap-4 text-center" : "grid grid-cols-[148px_minmax(0,1fr)] items-center gap-4 max-[860px]:grid-cols-1"}>
          <span className={compact ? "aspect-square w-full max-w-[240px] bg-cover bg-center bg-[var(--qr-background)]" : "h-[148px] w-[148px] rounded-[12px] border border-[var(--overlay-white-10)] bg-cover bg-center bg-[var(--qr-background)]"} style={{ backgroundImage: `url(${paymentSettings.paymentQrImageUrl})` }} />
          <div className={compact ? "grid w-full max-w-[240px] gap-3 text-[0.9rem] leading-[1.45] text-[var(--text-on-dark-muted)]" : "grid gap-2 text-[0.9rem] text-[var(--foreground-soft)]"}>
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
            <span className="block pt-1 text-center font-bold leading-[1.35] text-[var(--warning)]">ตรวจสลิปก่อนยืนยัน</span>
          </div>
        </div>
      ) : (
        <div className="rounded-[10px] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-[0.84rem] font-bold text-[var(--danger-bright)]">
          ตั้งค่ารับเงินยังไม่ครบ
        </div>
      )}
    </div>
  );
}

export function TransferInstructions({
  compact = false,
  hideCompactSummary = false,
  transferSelected,
  billTotal,
  paymentSettings,
  bankInfoFilled,
}: Omit<PaymentInstructionsProps, "qrPaymentSelected" | "dynamicPromptPayReady" | "staticQrReady" | "promptPayQrDataUrl">) {
  if (!transferSelected) {
    return null;
  }

  const wrapperClass = compact
    ? "grid content-start gap-3 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:grid-cols-[minmax(0,1fr)_auto] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:grid-rows-[auto_auto] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:gap-x-3 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:gap-y-2"
    : "grid gap-3 rounded-none border border-[var(--border-muted)] bg-[var(--overlay-white-03)] p-4";

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
      ) : hideCompactSummary ? null : (
        <div className="flex items-center justify-between gap-3 max-[520px]:flex-col max-[520px]:items-start [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:col-start-2 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:row-start-1 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:self-start [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:-mt-0.5 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:grid [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:justify-items-end [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:justify-self-end [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:gap-1 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:leading-tight [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:text-right">
          <strong className="text-[0.95rem] text-[var(--foreground)] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:text-[0.88rem]">
            ยอดโอน {formatBaht(billTotal)}
          </strong>
          <span className="text-[0.75rem] font-bold text-[var(--warning)] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:block [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:text-[0.68rem]">
            ตรวจสลิปหลังโอน
          </span>
        </div>
      )}

      {!paymentSettings.promptPayEnabled ? (
        <div className="border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-[0.84rem] font-bold text-[var(--danger-bright)]">
          ยังไม่ได้เปิดใช้การรับโอนเงิน <br />ในหน้าตั้งค่า
        </div>
      ) : bankInfoFilled ? (
        <div className="grid gap-2 rounded-none border border-[var(--border-subtle)] bg-[var(--field-bg)] px-3.5 py-3 text-[0.86rem] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:col-span-2 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:col-start-1 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:row-start-2 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:mt-0 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:w-full [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:justify-self-stretch [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:gap-0.5 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:px-2.5 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:py-1 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:text-[0.76rem]">
          <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:grid-cols-[56px_minmax(0,1fr)] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:gap-2">
            <span className="text-[var(--foreground-soft)]">ธนาคาร</span>
            <strong className="min-w-0 text-right leading-tight text-[var(--foreground)] [overflow-wrap:anywhere] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:text-[0.82rem]">{paymentSettings.bankName}</strong>
          </div>
          <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:grid-cols-[56px_minmax(0,1fr)] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:gap-2">
            <span className="text-[var(--foreground-soft)]">ชื่อบัญชี</span>
            <strong className="min-w-0 text-right leading-tight text-[var(--foreground)] [overflow-wrap:anywhere] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:text-[0.82rem]">{paymentSettings.bankAccountName}</strong>
          </div>
          <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:grid-cols-[56px_minmax(0,1fr)] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:gap-2">
            <span className="text-[var(--foreground-soft)] text-left">เลขบัญชี</span>
            <strong className="text-right text-[1.05rem] leading-tight text-[var(--brand-strong)] select-all [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:text-[0.9rem]">
              {paymentSettings.bankAccountNumber}
            </strong>
          </div>
        </div>
      ) : (
        <div className="border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-[0.84rem] font-bold text-[var(--danger-bright)]">
          ยังไม่ได้ตั้งค่าบัญชีธนาคาร
        </div>
      )}
    </div>
  );
}

