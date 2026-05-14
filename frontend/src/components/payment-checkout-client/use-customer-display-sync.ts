import { useCallback, useEffect, useState } from "react";

import { openCustomerDisplayWindow, readStoredCustomerDisplay, storeCustomerDisplay, type CustomerDisplayLink } from "@/components/customer-display-session";
import { requestJson } from "@/components/product-management-studio/lib";

import type { CompletedSale, PaymentMethod } from "./shared";

type CustomerDisplaySyncOptions = {
  amount: number;
  completedSale: CompletedSale | null;
  hasPendingItems: boolean;
  onError: (message: string) => void;
  paymentMethod: PaymentMethod;
  qrPaymentConfigured: boolean;
  selectedQrDataUrl: string;
  transferPaymentConfigured: boolean;
};

export type CustomerDisplayStateUpdate = {
  status: "IDLE" | "PAYMENT" | "SUCCESS";
  amount?: number;
  paymentMethod?: PaymentMethod;
  qrDataUrl?: string | null;
  message?: string | null;
  saleCode?: string | null;
};

type CustomerDisplayCreateResponse = {
  display: {
    id: string;
    name: string;
    status: "IDLE" | "PAYMENT" | "SUCCESS";
  };
  token: string;
  controlToken: string;
};

type CustomerDisplayStateResponse = {
  display: {
    id: string;
  };
  controlToken?: string;
};

export function useCustomerDisplaySync({
  amount,
  completedSale,
  hasPendingItems,
  onError,
  paymentMethod,
  qrPaymentConfigured,
  selectedQrDataUrl,
  transferPaymentConfigured,
}: CustomerDisplaySyncOptions) {
  const [customerDisplay, setCustomerDisplay] = useState<CustomerDisplayLink | null>(null);
  const [customerDisplayBusy, setCustomerDisplayBusy] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedDisplay = readStoredCustomerDisplay();
      if (storedDisplay) {
        setCustomerDisplay(storedDisplay);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const updateCustomerDisplay = useCallback(
    async (payload: CustomerDisplayStateUpdate) => {
      if (!customerDisplay) {
        return;
      }

      try {
        const response = await requestJson<CustomerDisplayStateResponse>(`/api/customer-displays/${encodeURIComponent(customerDisplay.id)}/state`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        if (response.controlToken) {
          const updatedDisplay = { ...customerDisplay, controlToken: response.controlToken };
          setCustomerDisplay(updatedDisplay);
          storeCustomerDisplay(updatedDisplay);
        }
      } catch {
        onError("ซิงก์จอลูกค้าไม่สำเร็จ กรุณาลองอีกครั้ง");
      }
    },
    [customerDisplay, onError],
  );

  const handleOpenCustomerDisplay = useCallback(async () => {
    if (customerDisplay) {
      openCustomerDisplayWindow(customerDisplay.url);
      return;
    }

    setCustomerDisplayBusy(true);
    try {
      const response = await requestJson<CustomerDisplayCreateResponse>("/api/customer-displays", {
        method: "POST",
        body: JSON.stringify({ name: "จอลูกค้า" }),
      });
      const url = `${window.location.origin}/display/${encodeURIComponent(response.display.id)}?token=${encodeURIComponent(response.token)}`;
      const displayLink = { id: response.display.id, token: response.token, controlToken: response.controlToken, url };
      setCustomerDisplay(displayLink);
      storeCustomerDisplay(displayLink);
      openCustomerDisplayWindow(url);
    } catch (displayError) {
      onError(displayError instanceof Error ? displayError.message : "เปิดจอลูกค้าไม่สำเร็จ");
    } finally {
      setCustomerDisplayBusy(false);
    }
  }, [customerDisplay, onError]);

  useEffect(() => {
    if (!customerDisplay || completedSale) {
      return;
    }

    if (!hasPendingItems) {
      const timeoutId = window.setTimeout(() => {
        void updateCustomerDisplay({ status: "IDLE" });
      }, 150);

      return () => window.clearTimeout(timeoutId);
    }

    const shouldShowPayment = (paymentMethod === "QR" && qrPaymentConfigured && Boolean(selectedQrDataUrl)) || (paymentMethod === "TRANSFER" && transferPaymentConfigured);

    const timeoutId = window.setTimeout(() => {
      if (!shouldShowPayment) {
        void updateCustomerDisplay({ status: "IDLE" });
        return;
      }

      void updateCustomerDisplay({
        status: "PAYMENT",
        amount,
        paymentMethod,
        qrDataUrl: selectedQrDataUrl || null,
        message:
          paymentMethod === "TRANSFER"
            ? "โอนเงินตามยอด แล้วแจ้งพนักงานหลังโอนสำเร็จ"
            : "สแกนเพื่อชำระเงิน แล้วแจ้งพนักงานหลังโอนสำเร็จ",
      });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [amount, completedSale, customerDisplay, hasPendingItems, paymentMethod, selectedQrDataUrl, qrPaymentConfigured, transferPaymentConfigured, updateCustomerDisplay]);

  return {
    customerDisplay,
    customerDisplayBusy,
    handleOpenCustomerDisplay,
    updateCustomerDisplay,
  };
}
