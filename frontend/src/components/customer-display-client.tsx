"use client";

/* eslint-disable @next/next/no-img-element -- จอลูกค้ารับ data URL ตาม token และรูปจาก store ที่อาจใช้ next/image loader ไม่ได้ */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isCustomerDisplayInvalidated } from "@/components/customer-display-session";
import type { PaymentMethod } from "@/components/payment-checkout-client/shared";
import {
  customerDisplayPollDelay,
  shouldRefreshCustomerDisplayStoreSnapshot,
  type CustomerDisplayConnectionState,
} from "@/components/customer-display/polling";
import { ConnectionPill, DisplayBlocked, LoadingStateLike, PaymentDisplay, StandbyDisplay, SuccessDisplay } from "@/components/customer-display/display-views";
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
  revokedAt?: string | null;
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

const rawPublicBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
const publicBackendUrl = (() => {
  if (!rawPublicBackendUrl) {
    return undefined;
  }

  try {
    const url = new URL(rawPublicBackendUrl);
    const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    return process.env.NODE_ENV === "production" && isLocalhost ? undefined : url.origin;
  } catch {
    return undefined;
  }
})();

export function CustomerDisplayClient({ displayId, token }: { displayId: string; token: string }) {
  const [payload, setPayload] = useState<CustomerDisplayPayload | null>(null);
  const [localTheme, setLocalTheme] = useState<OwnerThemeId | null>(() => readStoredOwnerTheme());
  const [connectionState, setConnectionState] = useState<CustomerDisplayConnectionState>("connecting");
  const [locallyInvalidated, setLocallyInvalidated] = useState(false);
  const connectionStateRef = useRef(connectionState);
  const eventSourceRef = useRef<EventSource | null>(null);
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

  const loadSnapshot = useCallback(
    async (cancelled: () => boolean) => {
      try {
        const response = await fetch(`/api/customer-displays/${encodeURIComponent(displayId)}/state?${query}`, {
          cache: "no-store",
        });
        const data = (await response.json().catch(() => null)) as CustomerDisplayPayload | { error?: string } | null;

        if (!response.ok) {
          if (!cancelled()) {
            if (response.status === 403 || response.status === 404 || response.status === 410) {
              setPayload(null);
            }
            setConnectionState(response.status === 403 || response.status === 404 || response.status === 410 ? "blocked" : "offline");
          }
          return;
        }

        if (!cancelled() && data && "display" in data) {
          if (data.display.revokedAt) {
            setConnectionState("blocked");
            return;
          }

          setPayload(data);
        }
      } catch {
        if (!cancelled()) {
          setConnectionState("offline");
        }
      }
    },
    [displayId, query],
  );

  const loadStoreSnapshot = useCallback(
    async (cancelled: () => boolean) => {
      try {
        const response = await fetch(storeSnapshotUrl, { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as CustomerDisplayStorePayload | null;
        if (!cancelled() && (response.status === 403 || response.status === 404 || response.status === 410)) {
          setPayload(null);
          setConnectionState("blocked");
          return;
        }
        if (!cancelled() && response.ok && data?.store) {
          setPayload((current) => (current ? { ...current, store: data.store } : current));
        }
      } catch {
        // ใช้ SSE เป็นช่องทางหลัก ส่วน polling metadata เป็น fallback เงียบ ๆ เท่านั้น
      }
    },
    [storeSnapshotUrl],
  );

  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);

  useEffect(() => {
    if (connectionState !== "blocked") {
      return;
    }

    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, [connectionState]);

  useEffect(() => {
    let cancelled = false;

    const events = new EventSource(eventSourceUrl);
    eventSourceRef.current = events;
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
        if (display.revokedAt) {
          setConnectionState("blocked");
          return;
        }
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
        void loadSnapshot(() => cancelled);
      }
    });

    return () => {
      cancelled = true;
      events.close();
      if (eventSourceRef.current === events) {
        eventSourceRef.current = null;
      }
    };
  }, [eventSourceUrl, loadSnapshot]);

  useEffect(() => {
    if (connectionState === "blocked") {
      return;
    }

    let cancelled = false;
    const isCancelled = () => cancelled;
    const pollDelay = customerDisplayPollDelay(connectionState);
    const initialTimer = window.setTimeout(() => {
      void loadSnapshot(isCancelled);
      void loadStoreSnapshot(isCancelled);
      lastStoreSnapshotAtRef.current = Date.now();
    }, 0);
    const snapshotInterval = window.setInterval(() => {
      const now = Date.now();
      void loadSnapshot(isCancelled);
      if (
        shouldRefreshCustomerDisplayStoreSnapshot({
          now,
          lastStoreSnapshotAt: lastStoreSnapshotAtRef.current,
          connectionState: connectionStateRef.current,
        })
      ) {
        lastStoreSnapshotAtRef.current = now;
        void loadStoreSnapshot(isCancelled);
      }
    }, pollDelay);

    return () => {
      cancelled = true;
      window.clearTimeout(initialTimer);
      window.clearInterval(snapshotInterval);
    };
  }, [connectionState, loadSnapshot, loadStoreSnapshot]);

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

  useEffect(() => {
    function syncInvalidationState(event?: StorageEvent) {
      if (event && event.key && event.key !== `pos-mans.customerDisplay.invalidated.${displayId}`) {
        return;
      }

      setLocallyInvalidated(isCustomerDisplayInvalidated(displayId));
    }

    syncInvalidationState();
    window.addEventListener("storage", syncInvalidationState);
    return () => {
      window.removeEventListener("storage", syncInvalidationState);
    };
  }, [displayId]);

  if (!token) {
    return <DisplayBlocked />;
  }

  if (locallyInvalidated) {
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
