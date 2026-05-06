"use client";

import { useCallback, useEffect, useState } from "react";
import { revokeStoredCustomerDisplay } from "@/components/customer-display-session";
import { useBackofficeShellAlert } from "@/components/backoffice-shell";
import { fetchWithCsrfRetry } from "@/lib/csrf";
import { clearStoredOwnerTheme } from "@/lib/owner-theme";

type SessionExpiryGuardProps = {
  initialExpiresAt: string;
};

type SessionMePayload = {
  session?: {
    expiresAt?: string;
  };
};

export function SessionExpiryGuard({ initialExpiresAt }: SessionExpiryGuardProps) {
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const { setShellAlert } = useBackofficeShellAlert();

  const forceLogoutForExpiry = useCallback(async () => {
    setShellAlert({
      tone: "info",
      message: "Session หมดอายุ กำลังกลับไปหน้า login...",
    });

    await revokeStoredCustomerDisplay().catch(() => undefined);

    await fetchWithCsrfRetry("/api/auth/logout", {
      method: "POST",
    }).catch(() => undefined);

    clearStoredOwnerTheme();
    window.setTimeout(() => {
      window.location.replace("/login");
    }, 1000);
  }, [setShellAlert]);

  const checkSessionExpiry = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => null)) as SessionMePayload | null;

      if (!response.ok || !payload?.session?.expiresAt) {
        await forceLogoutForExpiry();
        return;
      }

      const nextExpiresAt = new Date(payload.session.expiresAt).getTime();
      if (Number.isNaN(nextExpiresAt) || nextExpiresAt <= Date.now()) {
        await forceLogoutForExpiry();
        return;
      }

      setExpiresAt(payload.session.expiresAt);
    } catch {
      await forceLogoutForExpiry();
    }
  }, [forceLogoutForExpiry]);

  useEffect(() => {
    setExpiresAt(initialExpiresAt);
  }, [initialExpiresAt]);

  useEffect(() => {
    const expiryTime = new Date(expiresAt).getTime();
    if (Number.isNaN(expiryTime)) {
      return;
    }

    const remainingMs = Math.max(0, expiryTime - Date.now());
    const timeoutId = window.setTimeout(() => {
      void checkSessionExpiry();
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [checkSessionExpiry, expiresAt]);

  return null;
}
