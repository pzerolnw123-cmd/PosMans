"use client";

import { useEffect } from "react";
import { buildClientErrorReport, reportClientError } from "@/lib/client-error-reporting";
import { isRecoverableDevNetworkError } from "@/lib/dev-network-recovery";

const networkRecoveryStorageKey = "pos-mans-network-error-hard-reload-at";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isNetworkError = error.message.toLowerCase().includes("network error");
  const shouldAutoRecover = isRecoverableDevNetworkError(error);

  useEffect(() => {
    reportClientError(buildClientErrorReport("app-error-boundary", error, { recoverable: shouldAutoRecover }));

    if (!shouldAutoRecover) {
      console.error(error);
      return;
    }

    const now = Date.now();
    const lastRecoveryAt = Number(window.sessionStorage.getItem(networkRecoveryStorageKey) || 0);
    if (now - lastRecoveryAt < 10_000) {
      return;
    }

    window.sessionStorage.setItem(networkRecoveryStorageKey, String(now));
    const timeoutId = window.setTimeout(() => {
      window.location.reload();
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [error, shouldAutoRecover, reset]);

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--background)] px-4 py-8 text-[var(--foreground)]">
      <section className="w-full max-w-[420px] border border-[var(--border)] bg-[var(--surface)] px-5 py-5 shadow-[var(--shadow-card)]">
        <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Page Recovery</p>
        <h1 className="mb-0 mt-3 text-[1.65rem] leading-tight tracking-[-0.05em]">โหลดหน้านี้ไม่สำเร็จ</h1>
        <p className="mb-0 mt-3 text-[0.94rem] leading-[1.65] text-[var(--foreground-soft)]">
          {isNetworkError
            ? "การเชื่อมต่อกับ dev server สะดุด กำลังโหลดหน้าใหม่ให้อัตโนมัติ..."
            : "อาจเกิดจาก dev server หรือ backend สะดุดระหว่างที่หน้านี้เปิดอยู่ ลองโหลดใหม่อีกครั้งได้เลย"}
        </p>
        {error.digest ? (
          <p className="mb-0 mt-3 text-[0.78rem] leading-[1.45] text-[var(--foreground-soft)]">Error digest: {error.digest}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex min-h-[40px] items-center justify-center rounded-[10px] border border-transparent bg-[var(--brand-strong)] px-4 font-bold text-[var(--button-text)]"
            onClick={reset}
          >
            โหลดใหม่
          </button>
          <button
            type="button"
            className="inline-flex min-h-[40px] items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 font-bold text-[var(--foreground)]"
            onClick={() => window.history.back()}
          >
            ย้อนกลับ
          </button>
        </div>
      </section>
    </main>
  );
}
