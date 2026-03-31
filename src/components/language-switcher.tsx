"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { StoreLocale } from "@/lib/locale";

function buildRedirect(pathname: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function LanguageSwitcher({ locale }: { locale: StoreLocale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const redirect = buildRedirect(pathname, new URLSearchParams(searchParams));

  return (
    <details className="group relative">
      <summary className="inline-flex h-9 cursor-pointer list-none items-center rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
        {locale === "ar" ? "اللغة" : "Language"}
      </summary>
      <div className="absolute end-0 top-10 z-20 w-40 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
        <Link
          href={`/api/locale?lang=ar&redirect=${encodeURIComponent(redirect)}`}
          className={`block rounded px-2 py-1.5 text-xs ${locale === "ar" ? "bg-slate-100 font-semibold text-slate-700" : "text-slate-500 hover:bg-slate-50"}`}
          aria-current={locale === "ar" ? "true" : undefined}
        >
          العربية
        </Link>
        <Link
          href={`/api/locale?lang=en&redirect=${encodeURIComponent(redirect)}`}
          className={`mt-1 block rounded px-2 py-1.5 text-xs ${locale === "en" ? "bg-slate-100 font-semibold text-slate-700" : "text-slate-500 hover:bg-slate-50"}`}
          aria-current={locale === "en" ? "true" : undefined}
        >
          English
        </Link>
      </div>
    </details>
  );
}
