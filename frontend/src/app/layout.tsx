import type { Metadata } from "next";
import "./globals.css";
import { getCurrentSession } from "@/lib/session";

const themeInitScript = `(() => {
  const validThemes = new Set(["violet", "light", "dark", "mono"]);
  const defaultTheme = "light";
  try {
    const hasServerTheme = document.documentElement.dataset.userThemeSource === "server";
    if (hasServerTheme) {
      const serverTheme = document.documentElement.dataset.storeTheme;
      if (validThemes.has(serverTheme)) {
        window.localStorage.setItem("pos-mans-owner-theme", serverTheme);
      }
    } else {
      const savedTheme = window.localStorage.getItem("pos-mans-owner-theme");
      if (validThemes.has(savedTheme)) {
        document.documentElement.dataset.storeTheme = savedTheme;
      } else {
        document.documentElement.dataset.storeTheme = defaultTheme;
      }
    }
  } catch {}
})();`;

export const metadata: Metadata = {
  title: "POS MANS Backoffice",
  description: "Owner and superadmin workspaces for POS MANS",
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
      data-store-theme={ownerTheme}
      data-user-theme-source={userThemeSource}
    >
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  );
}
