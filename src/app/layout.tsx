import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dairy Ledger - Milk Delivery Management",
  description: "Offline-first dairy ledger and milk delivery management PWA for dairy owners and milk distributors. Track deliveries, manage customers, payments and expenses.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
  keywords: ["dairy", "milk delivery", "dairy management", "milk ledger", "delivery tracking", "dairy billing", "milk distribution"],
  openGraph: {
    title: "Dairy Ledger - Milk Delivery Management",
    description: "Track deliveries, manage customers, payments and expenses — all in one app.",
    siteName: "Dairy Ledger",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: "Dairy Ledger - Milk Delivery Management",
    description: "Track deliveries, manage customers, payments and expenses — all in one app.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-emerald-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold">Skip to main content</a>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
