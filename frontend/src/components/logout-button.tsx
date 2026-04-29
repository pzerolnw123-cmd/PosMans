"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { fetchWithCsrfRetry } from "@/lib/csrf";
import { clearStoredOwnerTheme } from "@/lib/owner-theme";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        await fetchWithCsrfRetry("/api/auth/logout", {
          method: "POST",
        });

        clearStoredOwnerTheme();

        startTransition(() => {
          router.push("/login");
          router.refresh();
        });
      }}
      className="mt-[14px] inline-flex min-h-[42px] w-full items-center justify-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-hover)] disabled:cursor-not-allowed disabled:opacity-[0.62] disabled:shadow-none"
    >
      {pending ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
    </button>
  );
}

