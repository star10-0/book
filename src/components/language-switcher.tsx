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
      <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
        {activeLocale === "ar" ? "اللغة" : "Language"}
      </summary>
      <div className="absolute end-0 top-9 z-20 w-40 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
        <button
          type="button"
          onClick={() => void changeLocale("ar")}
          className={`block w-full rounded px-2 py-1.5 text-start text-xs ${activeLocale === "ar" ? "bg-slate-100 font-semibold text-slate-700" : "text-slate-500 hover:bg-slate-50"}`}
          aria-current={activeLocale === "ar" ? "true" : undefined}
          disabled={isPending}
        >
          العربية
        </button>
        <button
          type="button"
          onClick={() => void changeLocale("en")}
          className={`mt-1 block w-full rounded px-2 py-1.5 text-start text-xs ${activeLocale === "en" ? "bg-slate-100 font-semibold text-slate-700" : "text-slate-500 hover:bg-slate-50"}`}
          aria-current={activeLocale === "en" ? "true" : undefined}
          disabled={isPending}
        >
          English
        </button>
      </div>
    </details>
  );
}
