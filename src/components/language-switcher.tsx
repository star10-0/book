"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { StoreLocale } from "@/lib/locale";

function buildRedirect(pathname: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function LanguageSwitcher({ locale }: { locale: StoreLocale }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [isPending, startTransition] = useTransition();
  const [activeLocale, setActiveLocale] = useState<StoreLocale>(locale);

  useEffect(() => {
    setActiveLocale(locale);
  }, [locale]);

  const redirect = useMemo(() => {
    return buildRedirect(pathname, new URLSearchParams(searchParams));
  }, [pathname, searchParams]);

  async function changeLocale(nextLocale: StoreLocale) {
    if (activeLocale === nextLocale || isPending) {
      detailsRef.current?.removeAttribute("open");
      return;
    }

    setActiveLocale(nextLocale);

    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lang: nextLocale }),
      });

      if (!response.ok) {
        throw new Error("Failed to update locale cookie");
      }

      detailsRef.current?.removeAttribute("open");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      window.location.assign(`/api/locale?lang=${nextLocale}&redirect=${encodeURIComponent(redirect)}`);
    }
  }

  return (
    <details ref={detailsRef} className="group relative">
      <summary className="inline-flex h-10 cursor-pointer list-none items-center rounded-lg border border-slate-600/80 bg-slate-900/85 px-3.5 text-xs font-semibold text-slate-100 transition-colors duration-200 hover:border-slate-500 hover:bg-slate-800/95 hover:text-white">
        {activeLocale === "ar" ? "اللغة" : "Language"}
      </summary>
      <div className="absolute end-0 top-10 z-20 w-40 rounded-lg border border-slate-700/90 bg-slate-900/98 p-1.5 shadow-lg">
        <button
          type="button"
          onClick={() => void changeLocale("ar")}
          className={`block w-full rounded-md px-2.5 py-2 text-start text-xs transition-colors ${activeLocale === "ar" ? "bg-slate-700/70 font-semibold text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
          aria-current={activeLocale === "ar" ? "true" : undefined}
          disabled={isPending}
        >
          العربية
        </button>
        <button
          type="button"
          onClick={() => void changeLocale("en")}
          className={`mt-1 block w-full rounded-md px-2.5 py-2 text-start text-xs transition-colors ${activeLocale === "en" ? "bg-slate-700/70 font-semibold text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
          aria-current={activeLocale === "en" ? "true" : undefined}
          disabled={isPending}
        >
          English
        </button>
      </div>
    </details>
  );
}
