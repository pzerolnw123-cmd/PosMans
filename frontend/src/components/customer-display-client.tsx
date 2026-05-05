"use client";

/* eslint-disable @next/next/no-img-element -- customer display accepts token-scoped data URLs and store-hosted images that may not be available through next/image loaders. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader } from "@/components/ui-primitives";
import { formatBaht, type PaymentMethod } from "@/components/payment-checkout-client/shared";
import { defaultOwnerTheme, isOwnerTheme, readStoredOwnerTheme, subscribeOwnerTheme, type OwnerThemeId } from "@/lib/owner-theme";

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

type CustomerDisplayStateEvent = CustomerDisplayState & {
  ownerTheme?: OwnerThemeId;
};

type CustomerDisplayPayload = {
  store: {
    name: string;
    logoUrl?: string | null;
    ownerTheme?: OwnerThemeId;
  };
  display: CustomerDisplayState;
};

type CustomerDisplayStoreUpdate = Partial<CustomerDisplayPayload["store"]>;
type CustomerDisplayStorePayload = {
  store: CustomerDisplayPayload["store"];
};

const publicBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "เงินสด",
  QR: "QR PromptPay",
  CARD: "บัตร",
  TRANSFER: "โอนเงิน",
  OTHER: "อื่น ๆ",
};

export function CustomerDisplayClient({ displayId, token }: { displayId: string; token: string }) {
  const [payload, setPayload] = useState<CustomerDisplayPayload | null>(null);
  const [localTheme, setLocalTheme] = useState<OwnerThemeId | null>(() => readStoredOwnerTheme());
  const [connectionState, setConnectionState] = useState<"connecting" | "live" | "offline" | "blocked">("connecting");
  const connectionStateRef = useRef(connectionState);
  const lastStoreSnapshotAtRef = useRef(0);
  const query = useMemo(() => new URLSearchParams({ token }).toString(), [token]);
  const eventSourceUrl = useMemo(() => {
    const path = `/api/customer-displays/${encodeURIComponent(displayId)}/events?${query}`;
    return publicBackendUrl ? `${publicBackendUrl.replace(/\/$/, "")}${path}` : path;
  }, [displayId, query]);
  const storeSnapshotUrl = useMemo(() => {
    const path = `/api/customer-displays/${encodeURIComponent(displayId)}/store?${query}`;
    return publicBackendUrl ? `${publicBackendUrl.replace(/\/$/, "")}${path}` : path;
  }, [displayId, query]);
  const payloadTheme = isOwnerTheme(payload?.store.ownerTheme) ? payload.store.ownerTheme : null;
  const displayTheme = payloadTheme || localTheme || defaultOwnerTheme;

  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);

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

    const events = new EventSource(eventSourceUrl);
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
        const display = JSON.parse((event as MessageEvent).data) as CustomerDisplayStateEvent;
        const { ownerTheme, ...displayState } = display;
        setPayload((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            store: isOwnerTheme(ownerTheme) ? { ...current.store, ownerTheme } : current.store,
            display: displayState,
          };
        });
        setConnectionState("live");
      } catch {
        setConnectionState("offline");
      }
    });
    events.addEventListener("store", (event) => {
      if (cancelled) {
        return;
      }

      try {
        const storeUpdate = JSON.parse((event as MessageEvent).data) as CustomerDisplayStoreUpdate;
        const normalizedStoreUpdate = {
          ...storeUpdate,
          ...(storeUpdate.ownerTheme === undefined || isOwnerTheme(storeUpdate.ownerTheme)
            ? {}
            : { ownerTheme: undefined }),
        };
        setPayload((current) => {
          if (!current) {
            return current;
          }

          return { ...current, store: { ...current.store, ...normalizedStoreUpdate } };
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
  }, [displayId, eventSourceUrl, query]);

  useEffect(() => {
    let cancelled = false;

    async function loadStoreSnapshot() {
      try {
        const response = await fetch(storeSnapshotUrl, { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as CustomerDisplayStorePayload | null;
        if (!cancelled && response.ok && data?.store) {
          setPayload((current) => (current ? { ...current, store: data.store } : current));
        }
      } catch {
        // SSE remains primary; store metadata polling is a quiet fallback.
      }
    }

    void loadStoreSnapshot();
    const snapshotInterval = window.setInterval(() => {
      const now = Date.now();
      const minimumDelay = connectionStateRef.current === "live" ? 30000 : 1500;
      if (now - lastStoreSnapshotAtRef.current >= minimumDelay) {
        lastStoreSnapshotAtRef.current = now;
        void loadStoreSnapshot();
      }
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(snapshotInterval);
    };
  }, [storeSnapshotUrl]);

  useEffect(() => {
    function syncStoredTheme() {
      setLocalTheme(readStoredOwnerTheme());
    }

    syncStoredTheme();
    return subscribeOwnerTheme(syncStoredTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.storeTheme = displayTheme;
  }, [displayTheme]);

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
    <main className="h-dvh overflow-hidden bg-[var(--background-start)] text-[var(--foreground)] [@media(orientation:portrait)]:h-auto [@media(orientation:portrait)]:min-h-dvh [@media(orientation:portrait)]:overflow-auto" data-store-theme={displayTheme}>
      <div className="mx-auto grid h-full min-h-0 w-full max-w-[980px] grid-rows-[auto_minmax(0,1fr)_auto] px-8 py-5 [@media(orientation:portrait)]:px-5 [@media(orientation:portrait)]:py-4 [@media(orientation:portrait)_and_(max-width:640px)]:px-4 [@media(orientation:portrait)_and_(max-width:640px)]:py-3.5 max-[720px]:px-5 max-[720px]:py-4">
        <header className="flex items-center justify-between gap-5 border-b border-[var(--border)] pb-3 [@media(orientation:portrait)_and_(max-width:640px)]:flex-col [@media(orientation:portrait)_and_(max-width:640px)]:items-start">
          <div className="flex min-w-0 items-center gap-4">
            {store.logoUrl ? <img className="h-12 w-12 rounded-none border border-[var(--border)] object-cover" src={store.logoUrl} alt="" /> : null}
            <div className="min-w-0">
              <p className="m-0 text-[0.78rem] font-bold uppercase tracking-[0.34em] text-[var(--eyebrow)]">Customer Display</p>
              <h1 className="m-0 mt-1 truncate text-[clamp(1.7rem,4.8vw,2.6rem)] leading-none tracking-[-0.05em]">{store.name}</h1>
            </div>
          </div>
          <ConnectionPill state={connectionState} />
        </header>

        {display.status === "PAYMENT" ? <PaymentDisplay display={display} /> : display.status === "SUCCESS" ? <SuccessDisplay display={display} /> : <StandbyDisplay />}

        <footer className="border-t border-[var(--border)] pt-3 text-center text-[0.86rem] font-medium text-[var(--foreground-soft)]">
          กรุณาตรวจสอบยอดก่อนชำระเงินทุกครั้ง
        </footer>
      </div>
    </main>
  );
}

function StandbyDisplay() {
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

function PaymentDisplay({ display }: { display: CustomerDisplayState }) {
  const method = display.paymentMethod ? paymentLabels[display.paymentMethod] : "ชำระเงิน";

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

function SuccessDisplay({ display }: { display: CustomerDisplayState }) {
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
    <span className="whitespace-nowrap border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[0.82rem] font-bold text-[var(--foreground)]">
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
