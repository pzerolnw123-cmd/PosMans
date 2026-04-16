"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { csrfCookieName, readCookie } from "@/lib/csrf";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        const csrfToken = readCookie(csrfCookieName);
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
          headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
        });

        startTransition(() => {
          router.push("/login");
          router.refresh();
        });
      }}
      className="rounded-2xl border border-[var(--border)] bg-white/80 px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}