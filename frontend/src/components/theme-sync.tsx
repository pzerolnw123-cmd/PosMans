"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import {
  applyOwnerTheme,
  applySystemOwnerTheme,
  defaultOwnerTheme,
  isOwnerTheme,
  readStoredOwnerTheme,
  type OwnerThemeId,
} from "@/lib/owner-theme";

type ThemeSource = "server" | "local";

export function ThemeSync({
  serverTheme,
  source,
}: {
  serverTheme: OwnerThemeId;
  source: ThemeSource;
}) {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (pathname === "/" || pathname === "/login") {
      applySystemOwnerTheme();
      return;
    }

    if (source === "server" && isOwnerTheme(serverTheme)) {
      applyOwnerTheme(readStoredOwnerTheme() || serverTheme, "server");
      return;
    }

    applyOwnerTheme(readStoredOwnerTheme() || defaultOwnerTheme, "local");
  }, [pathname, serverTheme, source]);

  return null;
}
