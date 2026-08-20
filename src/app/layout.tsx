import type { Metadata, Viewport } from "next";
import NextTopLoader from "nextjs-toploader";

import { QueryProvider } from "@/components/query-provider";
import { ServiceWorkerRegistrar } from "@/components/general/pwa/service-worker-registrar";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { fontVariables } from "@/app/fonts";

import "./globals.css";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3100");

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Kumtru — Trade with anyone. Trust the process.",
    template: "%s · Kumtru",
  },
  description:
    "Kumtru protects both sides of a deal: agree terms up front, hold the payment safely, and release it only when the agreement is met.",
  keywords: [
    "escrow",
    "trade protection",
    "buyer protection",
    "trust passport",
    "peer to peer payments",
    "Nigeria escrow",
    "Kumtru",
  ],
  applicationName: "Kumtru",
  manifest: "/site.webmanifest",
  // Installed as a PWA, opened from the home screen rather than from a link —
  // which is the same habit that keeps someone off a spoofed "your trade" URL.
  appleWebApp: {
    capable: true,
    title: "Kumtru",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/icons/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Kumtru",
    title: "Kumtru — Trade with anyone. Trust the process.",
    description:
      "Agree the terms, protect the payment, release it when the deal is honoured. Trade protection for buyers and sellers.",
    url: appUrl,
    images: [
      {
        url: new URL("/og-kumtru.png", appUrl).toString(),
        width: 1200,
        height: 630,
        alt: "Kumtru — trade protection and trust infrastructure",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kumtru — Trade with anyone. Trust the process.",
    description: "Agree the terms, protect the payment, release it when the deal is honoured.",
    images: [new URL("/og-kumtru.png", appUrl).toString()],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom stays available — pinch-to-zoom is an accessibility feature, not a
  // layout bug to suppress.
  maximumScale: 5,
  userScalable: true,
  // Lets the shell paint under the notch and home indicator; the tab bar and
  // headers pad themselves back out with env(safe-area-inset-*).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F7FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0D1420" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body className="font-body antialiased">
        <ThemeProvider>
          {/* Consumed as a CSS value, so it reads the same brand token as every class does. */}
          <NextTopLoader color="var(--color-kumtru-blue)" showSpinner={false} height={2} />
          <QueryProvider>{children}</QueryProvider>
          <Toaster position="top-center" />
          <ServiceWorkerRegistrar />
        </ThemeProvider>
      </body>
    </html>
  );
}
