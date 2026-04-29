"use client";

/* eslint-disable @next/next/no-img-element -- customer display accepts token-scoped data URLs and store-hosted images that may not be available through next/image loaders. */
import { useEffect, useMemo, useState } from "react";
import { Loader } from "@/components/ui-primitives";
import { formatBaht, type PaymentMethod } from "@/components/payment-checkout-client/shared";

type CustomerDisplayStatus = "IDLE" | "PAYMENT" | "SUCCESS";

type CustomerDisplayState = {
  id: string;
  name: string;
  status: CustomerDisplayStatus;
  amount: number;
  paymentMethod: PaymentMethod | null;
  qrDataUrl: string | null;
  message: string | null;
  saleCode: string | null;
  updatedAt: string;
};

type CustomerDisplayPayload = {
  store: {
    name: string;
    logoUrl?: string | null;
  };
  display: CustomerDisplayState;
};

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "เงินสด",
  QR: "QR PromptPay",
  CARD: "บัตร",
  TRANSFER: "โอนเงิน",
  OTHER: "อื่น ๆ",
};

export function CustomerDisplayClient({ displayId, token }: { displayId: string; token: string }) {
  const [payload, setPayload] = useState<CustomerDisplayPayload | null>(null);
  const [connectionState, setConnectionState] = useState<"connecting" | "live" | "offline" | "blocked">("connecting");
  const query = useMemo(() => new URLSearchParams({ token }).toString(), [token]);

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      try {
        const response = await fetch(`/api/customer-displays/${encodeURIComponent(displayId)}/state?${query}`, {
          cache: "no-store",
        });
        const data = (await response.json().catch(() => null)) as CustomerDisplayPayload | { error?: string } | null;

        if (!response.ok) {
          setConnectionState("blocked");
          return;
        }

        if (!cancelled && data && "display" in data) {
          setPayload(data);
        }
      } catch {
        if (!cancelled) {
          setConnectionState("offline");
        }
      }
    }

    loadSnapshot();

    const events = new EventSource(`/api/customer-displays/${encodeURIComponent(displayId)}/events?${query}`);
    events.addEventListener("open", () => {
      if (!cancelled) {
        setConnectionState("live");
      }
    });
    events.addEventListener("display", (event) => {
      if (cancelled) {
        return;
      }

      try {
        const display = JSON.parse((event as MessageEvent).data) as CustomerDisplayState;
        setPayload((current) => {
          if (!current) {
            return current;
          }

          return { ...current, display };
        });
        setConnectionState("live");
      } catch {
        setConnectionState("offline");
      }
    });
    events.addEventListener("error", () => {
      if (!cancelled) {
        setConnectionState("offline");
      }
    });

    return () => {
      cancelled = true;
      events.close();
    };
  }, [displayId, query]);

  if (!token) {
    return <DisplayBlocked />;
  }

  if (connectionState === "blocked") {
    return <DisplayBlocked />;
  }

  if (!payload) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f8ff] text-[#111827]">
        <LoadingStateLike label="กำลังเปิดจอลูกค้า..." />
      </main>
    );
  }

  const { store, display } = payload;

  return (
    <main className="min-h-screen bg-[#f4f8ff] text-[#111827]">
      <div className="mx-auto grid min-h-screen w-full max-w-[980px] grid-rows-[auto_1fr_auto] px-8 py-7 max-[720px]:px-5 max-[720px]:py-5">
        <header className="flex items-center justify-between gap-5 border-b border-[#cfd8e6] pb-5">
          <div className="flex min-w-0 items-center gap-4">
            {store.logoUrl ? <img className="h-14 w-14 rounded-none border border-[#cfd8e6] object-cover" src={store.logoUrl} alt="" /> : null}
            <div className="min-w-0">
              <p className="m-0 text-[0.78rem] font-bold uppercase tracking-[0.34em] text-[#527196]">Customer Display</p>
              <h1 className="m-0 mt-1 truncate text-[clamp(1.8rem,5vw,3rem)] leading-none tracking-[-0.05em]">{store.name}</h1>
            </div>
          </div>
          <ConnectionPill state={connectionState} />
        </header>

        {display.status === "PAYMENT" ? <PaymentDisplay display={display} /> : display.status === "SUCCESS" ? <SuccessDisplay display={display} /> : <StandbyDisplay />}

        <footer className="border-t border-[#cfd8e6] pt-4 text-center text-[0.9rem] font-medium text-[#5b6f8a]">
          กรุณาตรวจสอบยอดก่อนชำระเงินทุกครั้ง
        </footer>
      </div>
    </main>
  );
}

function StandbyDisplay() {
  return (
    <section className="grid place-items-center py-12 text-center">
      <div className="grid gap-4">
        <p className="m-0 text-[0.85rem] font-bold uppercase tracking-[0.36em] text-[#527196]">Standby</p>
        <h2 className="m-0 text-[clamp(2rem,7vw,4.6rem)] leading-none tracking-[-0.07em]">รอรายการชำระเงิน</h2>
        <p className="m-0 text-[clamp(1rem,2.4vw,1.3rem)] text-[#5b6f8a]">เมื่อถึงขั้นชำระเงิน QR และยอดชำระจะแสดงบนจอนี้</p>
      </div>
    </section>
  );
}

function PaymentDisplay({ display }: { display: CustomerDisplayState }) {
  const method = display.paymentMethod ? paymentLabels[display.paymentMethod] : "ชำระเงิน";

  return (
    <section className="grid place-items-center gap-7 py-8 text-center">
      <div>
        <p className="m-0 text-[0.92rem] font-bold uppercase tracking-[0.36em] text-[#2563eb]">{method}</p>
        <h2 className="m-0 mt-3 text-[clamp(2.4rem,9vw,6.3rem)] leading-none tracking-[-0.08em]">{formatBaht(display.amount)}</h2>
      </div>

      {display.qrDataUrl ? (
        <div className="grid aspect-square w-[min(62vh,560px,88vw)] place-items-center border border-[#d8e1ed] bg-white p-[clamp(16px,3vw,30px)] shadow-[0_22px_65px_rgba(39,76,119,0.12)]">
          <img className="h-full w-full object-contain" src={display.qrDataUrl} alt="QR สำหรับชำระเงิน" />
        </div>
      ) : (
        <div className="grid min-h-[280px] w-[min(560px,88vw)] place-items-center border border-dashed border-[#b6c6da] bg-white/70 text-[#5b6f8a]">
          รอยอดชำระจากแคชเชียร์
        </div>
      )}

      <p className="m-0 max-w-[620px] text-[clamp(1rem,2.3vw,1.35rem)] font-bold text-[#1d4ed8]">
        {display.message || "สแกนเพื่อชำระเงิน แล้วแจ้งพนักงานหลังโอนสำเร็จ"}
      </p>
    </section>
  );
}

function SuccessDisplay({ display }: { display: CustomerDisplayState }) {
  return (
    <section className="grid place-items-center py-12 text-center">
      <div className="grid gap-5">
        <p className="m-0 text-[0.9rem] font-bold uppercase tracking-[0.36em] text-[#15803d]">Payment Complete</p>
        <h2 className="m-0 text-[clamp(2.5rem,9vw,6rem)] leading-none tracking-[-0.08em]">ชำระเงินสำเร็จ</h2>
        <p className="m-0 text-[clamp(1.2rem,3vw,1.7rem)] font-bold text-[#334155]">{formatBaht(display.amount)}</p>
        <p className="m-0 text-[clamp(1rem,2.4vw,1.35rem)] text-[#5b6f8a]">ขอบคุณครับ</p>
      </div>
    </section>
  );
}

function DisplayBlocked() {
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

function ConnectionPill({ state }: { state: "connecting" | "live" | "offline" | "blocked" }) {
  const label = state === "live" ? "ออนไลน์" : state === "connecting" ? "กำลังเชื่อมต่อ" : "กำลังรอเชื่อมต่อ";
  return (
    <span className="whitespace-nowrap border border-[#cfd8e6] bg-white px-3 py-1.5 text-[0.82rem] font-bold text-[#334155]">
      {label}
    </span>
  );
}

function LoadingStateLike({ label }: { label: string }) {
  return (
    <div className="grid place-items-center gap-3 text-center">
      <Loader size={54} label={label} />
      <strong>{label}</strong>
    </div>
  );
}
