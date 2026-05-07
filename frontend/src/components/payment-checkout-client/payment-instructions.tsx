import { formatBaht, promptPayRecipientOptionsLabel } from "./shared";
import type { OwnerPaymentSettingsValue } from "@/components/owner-settings-client";
import { LoadingState } from "@/components/ui-primitives";

export type PaymentInstructionsProps = {
  compact?: boolean;
  hideCompactSummary?: boolean;
  hideCompactStatus?: boolean;
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
  hideCompactStatus = false,
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

  const compactQrLandscapeSize = 104;
  const compactQrLandscapeGridClass =
    "[@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:min-h-[74px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:min-h-[74px]";
  const compactQrLandscapeSizeClass =
    "[--compact-qr-size:148px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[--compact-qr-size:120px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[--compact-qr-size:120px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:max-w-[120px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:max-w-[120px]";
  const compactQrSummaryClass =
    "grid w-full justify-items-center gap-0.5 text-center text-[0.82rem] leading-[1.2] text-[var(--text-on-dark-muted)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:absolute [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:absolute [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:right-[8px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:right-[8px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:bottom-[14px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:bottom-[14px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:w-fit [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:w-fit [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:max-w-[148px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:max-w-[148px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:justify-items-end [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:justify-items-end [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-0.5 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-0.5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-right [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-right";
  const wrapperClass = compact
    ? "grid w-full content-start justify-items-center gap-2.5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:justify-items-stretch [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:justify-items-stretch"
    : "grid gap-3 rounded-none border border-[var(--border-muted)] bg-[var(--overlay-white-03)] p-4";

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
        <div className={compact ? `grid w-full justify-items-center gap-2.5 text-center ${compactQrLandscapeGridClass}` : "grid grid-cols-[148px_minmax(0,1fr)] items-center gap-4 max-[860px]:grid-cols-1"}>
          {promptPayQrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={promptPayQrDataUrl}
              alt="PromptPay QR"
              width={compact ? compactQrLandscapeSize : 148}
              height={compact ? compactQrLandscapeSize : 148}
              style={
                compact
                  ? {
                      width: "var(--compact-qr-size)",
                      height: "var(--compact-qr-size)",
                      maxWidth: "var(--compact-qr-size)",
                    }
                  : undefined
              }
              className={
                compact
                  ? `aspect-square w-full max-w-[148px] rounded-none bg-[var(--qr-background)] p-1 shadow-[var(--brand-shadow)_0_0_24px] ${compactQrLandscapeSizeClass} [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:absolute [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:absolute [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:left-1/2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:left-1/2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:top-1/2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:top-1/2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:-translate-x-1/2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:-translate-x-1/2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:-translate-y-1/2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:-translate-y-1/2`
                  : "h-[148px] w-[148px] rounded-none border border-[var(--accent-border)] bg-[var(--qr-background)] p-2 shadow-[var(--brand-shadow)_0_0_15px]"
              }
            />
          ) : (
            <div
              style={
                compact
                  ? {
                      width: "var(--compact-qr-size)",
                      height: "var(--compact-qr-size)",
                      maxWidth: "var(--compact-qr-size)",
                    }
                  : undefined
              }
              className={
                compact
                  ? `grid aspect-square w-full max-w-[148px] place-items-center rounded-none border border-dashed border-[var(--accent-border)] text-center text-[0.82rem] text-[var(--foreground-soft)] ${compactQrLandscapeSizeClass} [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:absolute [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:absolute [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:left-1/2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:left-1/2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:top-1/2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:top-1/2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:-translate-x-1/2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:-translate-x-1/2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:-translate-y-1/2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:-translate-y-1/2`
                  : "grid h-[148px] w-[148px] place-items-center rounded-none border border-dashed border-[var(--accent-border)] text-center text-[0.82rem] text-[var(--foreground-soft)]"
              }
            >
              <LoadingState size={compact ? 44 : 32} label="กำลังสร้าง QR..." />
            </div>
          )}
          {compact ? (
            <>
              <div className={compactQrSummaryClass}>
                <strong className="block whitespace-nowrap text-[0.74rem] leading-[1.1] text-[var(--foreground)]">QR PromptPay / {formatBaht(billTotal)}</strong>
                <span className="text-[0.6rem] leading-[1.1] text-[var(--foreground-soft)]">โอนเงิน</span>
              </div>
              {hideCompactStatus ? null : (
                <div className="grid gap-0.5 text-right [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:absolute [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:absolute [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:right-[8px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:right-[8px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:top-[8px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:top-[8px]">
                  <span className="text-[0.54rem] leading-[1.05] text-[var(--foreground-soft)]">ยอดถูกฝังใน QR แล้ว</span>
                  <span className="text-[0.58rem] font-bold leading-[1.05] text-[var(--warning)]">ตรวจสลิปก่อนยืนยัน</span>
                </div>
              )}
            </>
          ) : (
            <div className="grid gap-2 text-[0.9rem] text-[var(--foreground-soft)]">
              <>
                <span>ประเภท: {promptPayRecipientOptionsLabel(paymentSettings.promptPayRecipientType)}</span>
                <span>ยอดถูกฝังใน QR แล้ว</span>
              </>
            </div>
          )}
        </div>
      ) : staticQrReady ? (
        <div className={compact ? `grid w-full justify-items-center gap-2.5 text-center ${compactQrLandscapeGridClass}` : "grid grid-cols-[148px_minmax(0,1fr)] items-center gap-4 max-[860px]:grid-cols-1"}>
          <span className={compact ? `aspect-square w-full max-w-[148px] bg-cover bg-center bg-[var(--qr-background)] ${compactQrLandscapeSizeClass} [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:absolute [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:absolute [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:left-1/2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:left-1/2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:top-1/2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:top-1/2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:-translate-x-1/2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:-translate-x-1/2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:-translate-y-1/2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:-translate-y-1/2` : "h-[148px] w-[148px] rounded-[12px] border border-[var(--overlay-white-10)] bg-cover bg-center bg-[var(--qr-background)]"} style={compact ? { backgroundImage: `url(${paymentSettings.paymentQrImageUrl})`, width: "var(--compact-qr-size)", height: "var(--compact-qr-size)", maxWidth: "var(--compact-qr-size)" } : { backgroundImage: `url(${paymentSettings.paymentQrImageUrl})` }} />
          {compact ? (
            <>
              <div className={compactQrSummaryClass}>
                <strong className="block whitespace-nowrap text-[0.74rem] leading-[1.1] text-[var(--foreground)]">Static QR / {formatBaht(billTotal)}</strong>
                <span className="text-[0.6rem] leading-[1.1] text-[var(--foreground-soft)]">โอนเงิน</span>
              </div>
              {hideCompactStatus ? null : (
                <div className="grid gap-0.5 text-right [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:absolute [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:absolute [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:right-[8px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:right-[8px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:top-[8px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:top-[8px]">
                  <span className="text-[0.54rem] leading-[1.05] text-[var(--foreground-soft)]">ให้ลูกค้าโอนยอดนี้</span>
                  <span className="text-[0.58rem] font-bold leading-[1.05] text-[var(--warning)]">ตรวจสลิปก่อนยืนยัน</span>
                </div>
              )}
            </>
          ) : (
            <div className="grid gap-2 text-[0.9rem] text-[var(--foreground-soft)]">
              <>
                <span>Static QR จากธนาคาร</span>
                <span>ให้ลูกค้าโอน {formatBaht(billTotal)}</span>
              </>
            </div>
          )}
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
    ? "grid content-start gap-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-cols-[minmax(0,1fr)_auto] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-cols-[minmax(0,1fr)_auto] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-rows-[auto_auto] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-rows-[auto_auto] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-x-3 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-x-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-y-2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-y-2"
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
        <div className="flex items-center justify-between gap-3 max-[520px]:flex-col max-[520px]:items-start [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:col-start-2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:col-start-2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:row-start-1 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:row-start-1 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:self-start [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:self-start [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:-mt-0.5 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:-mt-0.5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:justify-items-end [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:justify-items-end [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:justify-self-end [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:justify-self-end [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-1 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-1 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:leading-tight [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:leading-tight [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-right [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-right">
          <strong className="text-[0.95rem] text-[var(--foreground)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.88rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.88rem]">
            ยอดโอน {formatBaht(billTotal)}
          </strong>
          <span className="text-[0.75rem] font-bold text-[var(--warning)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:block [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:block [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.68rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.68rem]">
            ตรวจสลิปหลังโอน
          </span>
        </div>
      )}

      {!paymentSettings.promptPayEnabled ? (
        <div className="border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-[0.84rem] font-bold text-[var(--danger-bright)]">
          ยังไม่ได้เปิดใช้การรับโอนเงิน <br />ในหน้าตั้งค่า
        </div>
      ) : bankInfoFilled ? (
        <div className="grid gap-2 rounded-none border border-[var(--border-subtle)] bg-[var(--field-bg)] px-3.5 py-3 text-[0.86rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:col-span-2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:col-span-2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:col-start-1 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:col-start-1 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:row-start-2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:row-start-2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:mt-0 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:mt-0 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:w-full [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:w-full [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:justify-self-stretch [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:justify-self-stretch [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-0.5 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-0.5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:px-2.5 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:px-2.5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:py-1 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:py-1 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.76rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.76rem]">
          <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-cols-[56px_minmax(0,1fr)] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-cols-[56px_minmax(0,1fr)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-2">
            <span className="text-[var(--foreground-soft)]">ธนาคาร</span>
            <strong className="min-w-0 text-right leading-tight text-[var(--foreground)] [overflow-wrap:anywhere] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.82rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.82rem]">{paymentSettings.bankName}</strong>
          </div>
          <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-cols-[56px_minmax(0,1fr)] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-cols-[56px_minmax(0,1fr)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-2">
            <span className="text-[var(--foreground-soft)]">ชื่อบัญชี</span>
            <strong className="min-w-0 text-right leading-tight text-[var(--foreground)] [overflow-wrap:anywhere] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.82rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.82rem]">{paymentSettings.bankAccountName}</strong>
          </div>
          <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-cols-[56px_minmax(0,1fr)] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-cols-[56px_minmax(0,1fr)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-2">
            <span className="text-[var(--foreground-soft)] text-left">เลขบัญชี</span>
            <strong className="text-right text-[1.05rem] leading-tight text-[var(--brand-strong)] select-all [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.9rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.9rem]">
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

