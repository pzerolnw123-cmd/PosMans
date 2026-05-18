import { useCallback, useEffect, useState } from "react";

import {
  clearStoredCustomerDisplay,
  openCustomerDisplayWindow,
  readStoredCustomerDisplay,
  storeCustomerDisplay,
  type CustomerDisplayLink,
} from "@/components/customer-display-session";
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
  storeId: string;
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

type RequestError = Error & {
  code?: string;
  status?: number;
};

function isStaleCustomerDisplayError(error: unknown) {
  const requestError = error as RequestError;
  return (
    requestError?.status === 403 ||
    requestError?.status === 404 ||
    requestError?.status === 410 ||
    requestError?.code === "DISPLAY_FORBIDDEN" ||
    requestError?.code === "DISPLAY_NOT_FOUND" ||
    requestError?.code === "DISPLAY_EXPIRED"
  );
}

export function useCustomerDisplaySync({
  amount,
  completedSale,
  hasPendingItems,
  onError,
  paymentMethod,
  qrPaymentConfigured,
  selectedQrDataUrl,
  storeId,
  transferPaymentConfigured,
}: CustomerDisplaySyncOptions) {
  const [customerDisplay, setCustomerDisplay] = useState<CustomerDisplayLink | null>(null);
  const [customerDisplayBusy, setCustomerDisplayBusy] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedDisplay = readStoredCustomerDisplay({ storeId });
      if (storedDisplay) {
        setCustomerDisplay(storedDisplay);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [storeId]);

  const clearCustomerDisplayState = useCallback(() => {
    clearStoredCustomerDisplay();
    setCustomerDisplay(null);
  }, []);

  const createCustomerDisplay = useCallback(async () => {
    const response = await requestJson<CustomerDisplayCreateResponse>("/api/customer-displays", {
      method: "POST",
      body: JSON.stringify({ name: "จอลูกค้า" }),
    });
    const url = `${window.location.origin}/display/${encodeURIComponent(response.display.id)}?token=${encodeURIComponent(response.token)}`;
    const displayLink = { id: response.display.id, token: response.token, controlToken: response.controlToken, storeId, url };
    setCustomerDisplay(displayLink);
    storeCustomerDisplay(displayLink);
    return displayLink;
  }, [storeId]);

  const sendCustomerDisplayState = useCallback(async (display: CustomerDisplayLink, payload: CustomerDisplayStateUpdate) => {
    const response = await requestJson<CustomerDisplayStateResponse>(`/api/customer-displays/${encodeURIComponent(display.id)}/state`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (response.controlToken) {
      const updatedDisplay = { ...display, controlToken: response.controlToken };
      setCustomerDisplay(updatedDisplay);
      storeCustomerDisplay(updatedDisplay);
      return updatedDisplay;
    }

    return display;
  }, []);

  const validateCustomerDisplay = useCallback(async (display: CustomerDisplayLink) => {
    const query = new URLSearchParams({ token: display.token }).toString();
    await requestJson(`/api/customer-displays/${encodeURIComponent(display.id)}/state?${query}`);
  }, []);

  const updateCustomerDisplay = useCallback(
    async (payload: CustomerDisplayStateUpdate) => {
      if (!customerDisplay) {
        return;
      }

      try {
        await sendCustomerDisplayState(customerDisplay, payload);
      } catch (error) {
        if (isStaleCustomerDisplayError(error)) {
          clearCustomerDisplayState();
          onError("จอลูกค้าหมดอายุแล้ว กรุณากดเปิดจอลูกค้าใหม่");
          return;
        }

        onError("ซิงก์จอลูกค้าไม่สำเร็จ กรุณาลองอีกครั้ง");
      }
    },
    [clearCustomerDisplayState, customerDisplay, onError, sendCustomerDisplayState],
  );

  const handleOpenCustomerDisplay = useCallback(async () => {
    setCustomerDisplayBusy(true);
    try {
      let displayLink = customerDisplay;
      if (displayLink) {
        try {
          await validateCustomerDisplay(displayLink);
        } catch (error) {
          if (!isStaleCustomerDisplayError(error)) {
            throw error;
          }
          clearCustomerDisplayState();
          displayLink = null;
        }
      }

      if (!displayLink) {
        displayLink = await createCustomerDisplay();
      }

      openCustomerDisplayWindow(displayLink.url);
    } catch (displayError) {
      onError(displayError instanceof Error ? displayError.message : "เปิดจอลูกค้าไม่สำเร็จ");
    } finally {
      setCustomerDisplayBusy(false);
    }
  }, [clearCustomerDisplayState, createCustomerDisplay, customerDisplay, onError, validateCustomerDisplay]);

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
