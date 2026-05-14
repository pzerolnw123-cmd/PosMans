/* eslint-disable @next/next/no-img-element -- จอลูกค้าแสดง QR data URL และรูป token-scoped ที่ไม่เหมาะกับ next/image */
import { Loader } from "@/components/ui-primitives";
import { formatBaht, type PaymentMethod } from "@/components/payment-checkout-client/shared";
import { paymentMethodLabels } from "@/lib/payment-methods";

type CustomerDisplayState = {
  amount: number;
  paymentMethod: PaymentMethod | null;
  qrDataUrl: string | null;
  message: string | null;
};

export function StandbyDisplay() {
  return (
    <section className="grid h-full min-h-0 place-items-center py-6 text-center">
      <div className="grid gap-4">
        <p className="m-0 text-[0.85rem] font-bold uppercase tracking-[0.36em] text-[var(--eyebrow)]">Standby</p>
        <h2 className="m-0 text-[clamp(2rem,7vw,4.6rem)] leading-none tracking-[-0.07em]">รอรายการชำระเงิน</h2>
        <p className="m-0 text-[clamp(1rem,2.4vw,1.3rem)] text-[var(--foreground-soft)]">เมื่อถึงขั้นชำระเงิน QR และยอดชำระจะแสดงบนจอนี้</p>
      </div>
    </section>
  );
}

export function PaymentDisplay({ display }: { display: CustomerDisplayState }) {
  const method = display.paymentMethod ? paymentMethodLabels[display.paymentMethod] : "ชำระเงิน";

  return (
    <section className="grid h-full min-h-0 place-items-center gap-3 overflow-hidden py-3 text-center [@media(orientation:portrait)]:py-5">
      <div>
        <p className="m-0 text-[0.92rem] font-bold uppercase tracking-[0.36em] text-[var(--brand-strong)]">{method}</p>
        <h2 className="m-0 mt-2 text-[clamp(2.35rem,8dvh,5.1rem)] leading-none tracking-[-0.08em]">{formatBaht(display.amount)}</h2>
      </div>

      {display.qrDataUrl ? (
        <div className="grid aspect-square w-[min(50dvh,520px,84vw)] place-items-center border border-[var(--border)] bg-[var(--foreground-inverse)] p-[clamp(14px,2.5vw,26px)] shadow-[var(--shadow-card)] [@media(orientation:portrait)]:w-[min(78vw,520px)] [@media(orientation:portrait)_and_(max-width:640px)]:w-[min(88vw,420px)]">
          <img className="h-full w-full object-contain" src={display.qrDataUrl} alt="QR สำหรับชำระเงิน" />
        </div>
      ) : (
        <div className="grid min-h-[280px] w-[min(560px,88vw)] place-items-center border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] text-[var(--foreground-soft)] [@media(orientation:portrait)]:w-[min(88vw,560px)]">
          รอยอดชำระจากแคชเชียร์
        </div>
      )}

      <p className="m-0 max-w-[620px] text-[clamp(0.96rem,2.1vw,1.22rem)] font-bold text-[var(--brand-strong)]">
        {display.message || "สแกนเพื่อชำระเงิน แล้วแจ้งพนักงานหลังโอนสำเร็จ"}
      </p>
    </section>
  );
}

export function SuccessDisplay({ display }: { display: CustomerDisplayState }) {
  return (
    <section className="grid h-full min-h-0 place-items-center py-6 text-center">
      <div className="grid gap-5">
        <p className="m-0 text-[0.9rem] font-bold uppercase tracking-[0.36em] text-[var(--success)]">Payment Complete</p>
        <h2 className="m-0 text-[clamp(2.5rem,9vw,6rem)] leading-none tracking-[-0.08em]">ชำระเงินสำเร็จ</h2>
        <p className="m-0 text-[clamp(1.2rem,3vw,1.7rem)] font-bold text-[var(--foreground)]">{formatBaht(display.amount)}</p>
        <p className="m-0 text-[clamp(1rem,2.4vw,1.35rem)] text-[var(--foreground-soft)]">ขอบคุณครับ</p>
      </div>
    </section>
  );
}

export function DisplayBlocked() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f8ff] px-5 text-center text-[#111827]">
      <div className="grid max-w-[460px] gap-3 border border-[#cfd8e6] bg-white p-6 shadow-[0_18px_50px_rgba(39,76,119,0.10)]">
        <p className="m-0 text-[0.78rem] font-bold uppercase tracking-[0.3em] text-[#527196]">Customer Display</p>
        <h1 className="m-0 text-[1.7rem] leading-tight tracking-[-0.05em]">ไม่สามารถเปิดจอลูกค้านี้ได้</h1>
        <p className="m-0 text-[#5b6f8a]">กรุณาเปิดลิงก์จากหน้าชำระเงินของร้านอีกครั้ง</p>
      </div>
    </main>
  );
}

export function ConnectionPill({ state }: { state: "connecting" | "live" | "offline" | "blocked" }) {
  const label = state === "live" ? "ออนไลน์" : state === "connecting" ? "กำลังเชื่อมต่อ" : "กำลังรอเชื่อมต่อ";
  return (
    <span className="whitespace-nowrap border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[0.82rem] font-bold text-[var(--foreground)]">
      {label}
    </span>
  );
}

export function LoadingStateLike({ label }: { label: string }) {
  return (
    <div className="grid place-items-center gap-3 text-center">
      <Loader size={54} label={label} />
      <strong>{label}</strong>
    </div>
  );
}
