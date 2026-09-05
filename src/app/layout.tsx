import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Index Vendor Intelligence",
  description:
    "Corporate action methodology comparison across MSCI, S&P DJI, FTSE Russell, STOXX, Solactive, Morningstar, and VettaFi. Understand why vendor projection data diverges.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="min-h-dvh min-h-screen bg-background font-sans antialiased"
      >
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
