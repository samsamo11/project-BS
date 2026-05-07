import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SonnerWrapper } from "@/components/shared/SonnerWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "B.S Evaluation",
    description: "تقييم فني للوضع الراهن للمباني الخرسانية المسلحة",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/icons/icon-192x192.png" sizes="192x192" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        {/* Register Service Worker — force update on new versions */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) {
                      console.log('SW registered:', reg.scope);
                      // Check for updates every 30 seconds
                      setInterval(function() {
                        reg.update();
                      }, 30000);
                    })
                    .catch(function(err) {
                      console.warn('SW registration failed:', err);
                    });
                  // If a new SW was installed while the page was hidden, reload
                  navigator.serviceWorker.addEventListener('controllerchange', function() {
                    window.location.reload();
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerWrapper />
      </body>
    </html>
  );
}
