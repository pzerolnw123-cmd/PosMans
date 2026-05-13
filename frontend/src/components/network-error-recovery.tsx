"use client";

import { useEffect } from "react";
import { isRecoverableDevNetworkError } from "@/lib/dev-network-recovery";

const networkRecoveryStorageKey = "pos-mans-network-error-hard-reload-at";

function scheduleNetworkRecovery() {
  const now = Date.now();
  const lastRecoveryAt = Number(window.sessionStorage.getItem(networkRecoveryStorageKey) || 0);

  if (now - lastRecoveryAt < 10_000) {
    return;
  }

  window.sessionStorage.setItem(networkRecoveryStorageKey, String(now));
  window.setTimeout(() => {
    window.location.reload();
  }, 500);
}

export function NetworkErrorRecovery() {
  useEffect(() => {
    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      if (!isRecoverableDevNetworkError(event.reason)) {
        return;
      }

      event.preventDefault();
      scheduleNetworkRecovery();
    }

    function handleError(event: ErrorEvent) {
      if (!isRecoverableDevNetworkError(event.error) && !isRecoverableDevNetworkError(event.message)) {
        return;
      }

      event.preventDefault();
      scheduleNetworkRecovery();
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}
