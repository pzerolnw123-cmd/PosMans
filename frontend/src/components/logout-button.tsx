"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
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
      className="logout-button"
      style={{ width: "100%", marginTop: 14 }}
    >
      {pending ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
    </button>
  );
}
