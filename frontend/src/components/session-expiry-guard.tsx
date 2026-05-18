"use client";

import { useCallback, useEffect, useState } from "react";
import { useBackofficeShellAlert } from "@/components/backoffice-shell";
import { revokeStoredCustomerDisplay } from "@/components/customer-display-session";
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
  const [sessionCheckRetryAt, setSessionCheckRetryAt] = useState<number | null>(null);
  const [sessionCheckRetryCount, setSessionCheckRetryCount] = useState(0);
  const { setShellAlert } = useBackofficeShellAlert();

  const forceLogoutForExpiry = useCallback(async () => {
    setShellAlert({
      tone: "info",
      message: "Session หมดอายุ กำลังกลับไปหน้า login...",
    });

    await fetchWithCsrfRetry("/api/auth/logout", {
      method: "POST",
    }).catch(() => undefined);

    clearStoredOwnerTheme();
    void revokeStoredCustomerDisplay().catch(() => undefined);
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
      setSessionCheckRetryCount(0);
    } catch {
      if (sessionCheckRetryCount >= 2) {
        await forceLogoutForExpiry();
        return;
      }

      setShellAlert({
        tone: "info",
        message: "เช็ก session ไม่สำเร็จ กำลังลองเชื่อมต่ออีกครั้ง...",
      });
      setSessionCheckRetryCount((current) => current + 1);
      setSessionCheckRetryAt(Date.now() + 5000);
    }
  }, [forceLogoutForExpiry, sessionCheckRetryCount, setShellAlert]);

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

  useEffect(() => {
    if (!sessionCheckRetryAt) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSessionCheckRetryAt(null);
      void checkSessionExpiry();
    }, Math.max(0, sessionCheckRetryAt - Date.now()));

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [checkSessionExpiry, sessionCheckRetryAt]);

  return null;
}
