"use client";

import { useEffect } from "react";

const networkRecoveryStorageKey = "pos-mans-network-error-hard-reload-at";

function isNetworkError(value: unknown) {
  if (value instanceof Error) {
    return value.message.toLowerCase().includes("network error");
  }

  return typeof value === "string" && value.toLowerCase().includes("network error");
}

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
      if (!isNetworkError(event.reason)) {
        return;
      }

      event.preventDefault();
      scheduleNetworkRecovery();
    }

    function handleError(event: ErrorEvent) {
      if (!isNetworkError(event.error) && !isNetworkError(event.message)) {
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
