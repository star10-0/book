import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { SiteHeader } from "@/components/site-header";
import { getStoreDirection, getStoreLocale } from "@/lib/locale";
import { getAppBaseUrl } from "@/lib/env";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants/app";
import "./globals.css";

const appTitle = APP_NAME;
const appDescription = "منصة عربية حديثة لشراء واستئجار الكتب الرقمية مع تجربة قراءة سهلة وسريعة.";
const appBaseUrl = getAppBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appBaseUrl),
  title: {
    default: `${appTitle} | مكتبة رقمية عربية`,
    template: `%s | ${appTitle}`,
  },
  description: appDescription,
  applicationName: APP_NAME,
  alternates: {
    canonical: "/",
    languages: {
      ar: "/",
    },
  },
  category: "books",
  keywords: ["كتب عربية", "كتب رقمية", "مكتبة إلكترونية", "استئجار كتب", "شراء كتب"],
  openGraph: {
    title: `${appTitle} | مكتبة رقمية عربية`,
    description: appDescription,
    locale: "ar_SY",
    type: "website",
    siteName: appTitle,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${appTitle} | مكتبة رقمية عربية`,
    description: appDescription,
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/icons/source-book-icon.svg", sizes: "any", type: "image/svg+xml" },
      { url: "/icons/source-book-icon.svg", rel: "shortcut icon", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/source-book-icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getStoreLocale();
  const dir = getStoreDirection(locale);

  return (
    <html lang={locale} dir={dir}>
      <body className="font-sans bg-slate-50 text-slate-900">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          الانتقال إلى المحتوى الرئيسي
        </a>
        <ServiceWorkerRegister />
        <div className="store-page-shell min-h-screen">
          <div className="store-container pb-6 pt-2 sm:pb-8 sm:pt-3 lg:pt-4">
            <SiteHeader />
            <div id="main-content">{children}</div>
          </div>
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: APP_NAME,
              description: APP_DESCRIPTION,
              inLanguage: "ar",
              url: appBaseUrl,
            }),
          }}
        />
      </body>
    </html>
  );
}
