import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeSync } from "@/components/theme-sync";
import { getCurrentSession } from "@/lib/session";
import { defaultOwnerTheme, ownerThemeIds, ownerThemeStorageKey } from "@/lib/owner-theme";

const themeInitScript = `(() => {
  const validThemes = new Set(${JSON.stringify(ownerThemeIds)});
  const defaultTheme = ${JSON.stringify(defaultOwnerTheme)};
  const storageKey = ${JSON.stringify(ownerThemeStorageKey)};
  const systemThemeOnlyPaths = new Set(["/", "/login"]);
  try {
    if (systemThemeOnlyPaths.has(window.location.pathname)) {
      document.documentElement.dataset.storeTheme = defaultTheme;
      document.documentElement.dataset.userThemeSource = "system";
      return;
    }

    const serverTheme = document.documentElement.dataset.serverStoreTheme;
    const hasServerTheme = document.documentElement.dataset.userThemeSource === "server";
    if (hasServerTheme) {
      if (validThemes.has(serverTheme)) {
        document.documentElement.dataset.storeTheme = serverTheme;
        window.localStorage.setItem(storageKey, serverTheme);
      }
    } else {
      const savedTheme = window.localStorage.getItem(storageKey);
      if (validThemes.has(savedTheme)) {
        document.documentElement.dataset.storeTheme = savedTheme;
      } else {
        document.documentElement.dataset.storeTheme = defaultTheme;
      }
    }
  } catch {
    // Storage can be unavailable in private mode or hardened browsers; keep the server theme.
  }
})();`;

export const metadata: Metadata = {
  applicationName: "POS MANS",
  title: "POS MANS",
  description: "Owner and superadmin workspaces for POS MANS",
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "POS MANS",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "POS MANS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();
  const ownerTheme = session?.user.storeRole === "OWNER" && session.user.ownerTheme ? session.user.ownerTheme : "light";
  const userThemeSource = session?.user.storeRole === "OWNER" && session.user.ownerTheme ? "server" : "local";

  return (
    <html
      lang="th"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      data-store-theme="light"
      data-server-store-theme={ownerTheme}
      data-user-theme-source={userThemeSource}
    >
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeSync serverTheme={ownerTheme} source={userThemeSource} />
        {children}
      </body>
    </html>
  );
}
