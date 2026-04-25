import type { Metadata } from "next";
import "./globals.css";

const themeInitScript = `(() => {
  try {
    const savedTheme = window.localStorage.getItem("pos-mans-owner-theme");
    if (
      savedTheme === "violet" ||
      savedTheme === "light" ||
      savedTheme === "dark"
    ) {
      document.documentElement.dataset.storeTheme = savedTheme;
    }
  } catch {}
})();`;

export const metadata: Metadata = {
  title: "POS MANS Backoffice",
  description: "Owner and superadmin workspaces for POS MANS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning data-scroll-behavior="smooth" data-store-theme="violet">
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  );
}
