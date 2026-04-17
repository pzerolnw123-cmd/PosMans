import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
