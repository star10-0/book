import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Book | مكتبة رقمية عربية",
  description: "منصة عربية لشراء واستئجار الكتب الرقمية.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-sans">
        <div className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </body>
    </html>
  );
}
