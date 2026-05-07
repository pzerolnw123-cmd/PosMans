"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeStoredCustomerDisplay } from "@/components/customer-display-session";
import { useBackofficeShellAlert } from "@/components/backoffice-shell";
import { fetchWithCsrfRetry } from "@/lib/csrf";
import { clearStoredOwnerTheme } from "@/lib/owner-theme";

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { setShellAlert } = useBackofficeShellAlert();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        await revokeStoredCustomerDisplay().catch(() => undefined);

        try {
          await fetchWithCsrfRetry("/api/auth/logout", {
            method: "POST",
          });
        } catch {
          setShellAlert({
            message: "เชื่อมต่อระบบเพื่อออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง",
            tone: "danger",
          });
          return;
        }

        clearStoredOwnerTheme();

        startTransition(() => {
          router.push("/login");
          router.refresh();
        });
      }}
      className={`mt-[14px] inline-flex min-h-[42px] w-full items-center justify-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-hover)] disabled:cursor-not-allowed disabled:opacity-[0.62] disabled:shadow-none ${className}`.trim()}
    >
      {pending ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
    </button>
  );
}

