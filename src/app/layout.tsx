import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { activeThemeVariables } from "../theme/palette";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")
  ? process.env.NEXT_PUBLIC_SITE_URL
  : "https://beta.dexter.cash";

const ogImage = "https://dexter.cash/assets/og/dexter-default.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Dexter Voice • Realtime crypto copilot",
  description: "Dexter Voice lets you trade crypto hands-free with realtime speech, guardrails, and on-chain receipts.",
  applicationName: "Dexter Voice",
  openGraph: {
    title: "Dexter Voice • Realtime crypto copilot",
    description: "Speak to Dexter to quote, execute, and log trades with live on-chain proof.",
    url: siteUrl,
    siteName: "Dexter Voice",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Dexter wordmark and crest over the realtime crypto copilot headline",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dexter Voice • Realtime crypto copilot",
    description: "Speak to Dexter to quote, execute, and log trades with live on-chain proof.",
    creator: "@dexter",
    site: "@dexter",
    images: [ogImage],
  },
  icons: {
    icon: "/assets/logos/logo.svg",
    apple: "/assets/logos/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF6500",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={activeThemeVariables}>
      <body className={`antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
