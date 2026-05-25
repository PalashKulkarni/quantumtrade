import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "QuantumTrade AI",
    template: "%s · QuantumTrade AI",
  },
  description:
    "AI-native institutional trading OS — multi-agent decisioning, explainable AI, real-time portfolio risk intelligence.",
  keywords: ["trading", "AI", "portfolio", "quant", "NSE", "NASDAQ", "backtesting"],
  authors: [{ name: "QuantumTrade AI" }],
  openGraph: {
    title: "QuantumTrade AI",
    description: "AI-native institutional trading OS",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#061016",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
