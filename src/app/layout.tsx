import type { Metadata } from "next";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import "./globals.css";

const appTitle = "Book";
const appDescription = "منصة عربية حديثة لشراء واستئجار الكتب الرقمية مع تجربة قراءة سهلة وسريعة.";

export const metadata: Metadata = {
  metadataBase: new URL("https://book.example"),
  title: {
    default: `${appTitle} | مكتبة رقمية عربية`,
    template: `%s | ${appTitle}`,
  },
  description: appDescription,
  applicationName: appTitle,
  keywords: ["كتب عربية", "كتب رقمية", "مكتبة إلكترونية", "استئجار كتب", "شراء كتب"],
  openGraph: {
    title: `${appTitle} | مكتبة رقمية عربية`,
    description: appDescription,
    locale: "ar_SY",
    type: "website",
    siteName: appTitle,
  },
  twitter: {
    card: "summary_large_image",
    title: `${appTitle} | مكتبة رقمية عربية`,
    description: appDescription,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/favicon.ico", rel: "shortcut icon" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-sans">
        <ServiceWorkerRegister />
        <div className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</div>
      </body>
    </html>
  );
}
