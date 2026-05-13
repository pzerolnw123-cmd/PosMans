import { useEffect, useState } from "react";

import type { OwnerPaymentSettingsValue } from "@/components/owner-settings-client";
import { readActiveOwnerTheme, subscribeOwnerTheme } from "@/lib/owner-theme";

import type { CompletedSale } from "./shared";
import { createPromptPayPayload } from "./shared";

type PromptPayQrOptions = {
  billTotal: number;
  completedSale: CompletedSale | null;
  dynamicPromptPayReady: boolean;
  paymentSettings: OwnerPaymentSettingsValue;
  qrPaymentSelected: boolean;
};

export function usePromptPayQrDataUrl({
  billTotal,
  completedSale,
  dynamicPromptPayReady,
  paymentSettings,
  qrPaymentSelected,
}: PromptPayQrOptions) {
  const [promptPayQrDataUrl, setPromptPayQrDataUrl] = useState("");
  const [activeTheme, setActiveTheme] = useState(() => readActiveOwnerTheme());

  useEffect(() => {
    function syncActiveTheme() {
      setActiveTheme(readActiveOwnerTheme());
    }

    syncActiveTheme();
    return subscribeOwnerTheme(syncActiveTheme);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function generatePromptPayQr() {
      if (!qrPaymentSelected || !dynamicPromptPayReady || completedSale) {
        setPromptPayQrDataUrl("");
        return;
      }

      const payload = createPromptPayPayload(paymentSettings, billTotal);
      if (!payload) {
        setPromptPayQrDataUrl("");
        return;
      }

      try {
        const rootStyle = getComputedStyle(document.documentElement);
        const qrForeground = rootStyle.getPropertyValue("--qr-foreground").trim() || rootStyle.getPropertyValue("--brand").trim();
        const qrBackground = rootStyle.getPropertyValue("--qr-background").trim() || rootStyle.getPropertyValue("--foreground-inverse").trim();
        const { toDataURL } = await import("qrcode");
        const dataUrl = await toDataURL(payload, {
          errorCorrectionLevel: "M",
          margin: 2,
          scale: 7,
          color: {
            dark: qrForeground,
            light: qrBackground,
          },
        });
        if (!cancelled) {
          setPromptPayQrDataUrl(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setPromptPayQrDataUrl("");
        }
      }
    }

    generatePromptPayQr();

    return () => {
      cancelled = true;
    };
  }, [activeTheme, billTotal, completedSale, dynamicPromptPayReady, paymentSettings, qrPaymentSelected]);

  return promptPayQrDataUrl;
}
