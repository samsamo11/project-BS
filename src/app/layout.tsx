import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SonnerWrapper } from "@/components/shared/SonnerWrapper";
import { QueryProvider } from '@/components/providers/QueryProvider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "B.S Evaluation - تقييم المباني الخرسانية",
  description: "تقييم فني للوضع الراهن للمباني الخرسانية المسلحة - الكود العربي السوري 2024",
  keywords: [
    "تقييم مباني",
    "خرسانة مسلحة",
    "كود سوري",
    "هندسة مدنية",
    "Building Evaluation",
    "Structural Assessment",
    "Syrian Code",
  ],
  authors: [{ name: "Eng. Bashar Al-Sulaiman" }],
  manifest: "/manifest.json",
  openGraph: {
    title: "B.S Evaluation",
    description: "تقييم فني للوضع الراهن للمباني الخرسانية المسلحة",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#059669" },
    { media: "(prefers-color-scheme: dark)", color: "#064e3b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="B.S Evaluation" />
        {/* CRITICAL: Destroy any Service Workers from previous versions.
            This script runs BEFORE React hydrates, ensuring stale SW cannot
            intercept network requests or serve cached responses. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    regs.forEach(function(reg) { reg.unregister(); });
                  });
                }
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    names.forEach(function(name) { caches.delete(name); });
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <QueryProvider>{children}</QueryProvider>
        <Toaster />
        <SonnerWrapper />
      </body>
    </html>
  );
}
