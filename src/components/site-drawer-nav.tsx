"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { StoreLocale } from "@/lib/locale";

type NavLink = {
  href: string;
  label: string;
};

type SiteDrawerNavProps = {
  locale: StoreLocale;
  primaryLinks: NavLink[];
  accountLinks: NavLink[];
  userSignedIn: boolean;
  canAccessStudio: boolean;
  canAccessAdmin: boolean;
  logoutAction?: () => Promise<void>;
  triggerLabel?: string;
  triggerClassName?: string;
  triggerIconClassName?: string;
};

export function SiteDrawerNav({
  locale,
  primaryLinks,
  accountLinks,
  userSignedIn,
  canAccessStudio,
  canAccessAdmin,
  logoutAction,
  triggerLabel,
  triggerClassName,
  triggerIconClassName,
}: SiteDrawerNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const menuId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const t =
    locale === "en"
      ? {
          openMenu: "Open menu",
          closeMenu: "Close menu",
          browseStore: "Browse store",
          shopping: "Shop books",
          allBooks: "All books",
          buyDigital: "Buy digital",
          rentDigital: "Rent digital",
          discover: "Discover",
          info: "Help & information",
          account: "Account",
          accountHome: "Account",
          signIn: "Sign in to continue",
          myLibrary: "My library",
          creator: "Creator workspace",
          profile: "Profile",
          orders: "Orders",
          studioBooks: "Studio books",
          studioProfile: "Creator profile",
          admin: "Admin",
          logout: "Sign out",
        }
      : {
          openMenu: "فتح القائمة",
          closeMenu: "إغلاق القائمة",
          browseStore: "تصفح المتجر",
          shopping: "تسوق الكتب",
          allBooks: "كل الكتب",
          buyDigital: "شراء رقمي",
          rentDigital: "استئجار رقمي",
          discover: "اكتشف",
          info: "المساعدة والمعلومات",
          account: "الحساب",
          accountHome: "الحساب الشخصي",
          signIn: "سجّل الدخول للمتابعة",
          myLibrary: "مكتبتي",
          creator: "حساب الكاتب والأعمال",
          profile: "الملف الشخصي",
          orders: "الطلبات",
          studioBooks: "كتبي في الاستوديو",
          studioProfile: "ملف الكاتب",
          admin: "الإدارة",
          logout: "تسجيل الخروج",
        };

  const infoLinks = useMemo(() => {
    const infoHrefs = new Set(["/about", "/help", "/contact"]);
    return primaryLinks.filter((link) => infoHrefs.has(link.href));
  }, [primaryLinks]);

  const discoveryLinks = useMemo(() => {
    const seen = new Set<string>();
    const discovery = [
      ...primaryLinks.filter((link) => link.href === "/" || link.href === "/books"),
      ...primaryLinks.filter((link) => !["/about", "/help", "/contact", "/", "/books"].includes(link.href)),
    ];

    return discovery.filter((link) => {
      if (seen.has(link.href)) {
        return false;
      }
      seen.add(link.href);
      return true;
    });
  }, [primaryLinks]);

  const accountBaseLinks: NavLink[] = [
    {
      href: userSignedIn ? "/account" : "/login?callbackUrl=%2Faccount",
      label: userSignedIn ? t.accountHome : t.signIn,
    },
    {
      href: userSignedIn ? "/account/library" : "/login?callbackUrl=%2Faccount%2Flibrary",
      label: t.myLibrary,
    },
    {
      href: userSignedIn ? "/studio" : "/login?callbackUrl=%2Fstudio",
      label: t.creator,
    },
    {
      href: userSignedIn ? "/account/profile" : "/login?callbackUrl=%2Faccount%2Fprofile",
      label: t.profile,
    },
    {
      href: userSignedIn ? "/account/orders" : "/login?callbackUrl=%2Faccount%2Forders",
      label: t.orders,
    },
    ...accountLinks,
    ...(canAccessStudio
      ? [
          { href: "/studio/books", label: t.studioBooks },
          { href: "/studio/profile", label: t.studioProfile },
        ]
      : []),
    ...(canAccessAdmin ? [{ href: "/admin", label: t.admin }] : []),
  ];

  const seenAccountHrefs = new Set<string>();
  const accountActionLinks = accountBaseLinks.filter((link) => {
    if (seenAccountHrefs.has(link.href)) {
      return false;
    }
    seenAccountHrefs.add(link.href);
    return true;
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    closeButtonRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (containerRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  const panelSideAlignment =
    locale === "ar"
      ? "start-[calc(100%+0.5rem)] top-0 origin-top-right max-[480px]:start-auto max-[480px]:end-0 max-[480px]:top-full max-[480px]:mt-2"
      : "start-[calc(100%+0.5rem)] top-0 origin-top-left max-[480px]:start-0 max-[480px]:top-full max-[480px]:mt-2";

  return (
    <div ref={containerRef} className="relative inline-flex z-[120]">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={menuId}
        className={
          triggerClassName ??
          "inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-sm text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        }
        aria-label={isOpen ? t.closeMenu : t.openMenu}
      >
        <span aria-hidden className={triggerIconClassName}>
          ☰
        </span>
        {triggerLabel ? <span>{triggerLabel}</span> : null}
      </button>

      <div
        id={menuId}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        className={`absolute ${panelSideAlignment} w-[min(24rem,calc(100vw-1rem))] max-h-[min(80vh,36rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_56px_-28px_rgba(15,23,42,0.75)] transition duration-200 ${
          isOpen ? "pointer-events-auto translate-y-0 opacity-100 scale-100" : "pointer-events-none -translate-y-1 opacity-0 scale-95"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/85">
          <p id={titleId} className="text-sm font-extrabold text-slate-900">
            {t.browseStore}
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setIsOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            aria-label={t.closeMenu}
            tabIndex={isOpen ? 0 : -1}
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-4 text-sm">
          <div className="space-y-4">
              <section aria-label={t.shopping} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <p className="mb-2 text-xs font-bold tracking-wide text-slate-500">{t.shopping}</p>
                <div className="grid gap-2">
                  <Link
                    href="/books"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between rounded-xl bg-indigo-600 px-3 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
                  >
                    {t.allBooks}
                  </Link>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/books?offer=buy"
                      onClick={() => setIsOpen(false)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {t.buyDigital}
                    </Link>
                    <Link
                      href="/books?offer=rent"
                      onClick={() => setIsOpen(false)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {t.rentDigital}
                    </Link>
                  </div>
                </div>
              </section>

              <section aria-label={t.discover} className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <p className="mb-2 text-xs font-bold tracking-wide text-slate-500">{t.discover}</p>
                <ul className="space-y-1">
                  {discoveryLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        className="block rounded-lg px-3 py-2 text-slate-700 transition hover:bg-slate-100"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              {infoLinks.length > 0 ? (
                <section aria-label={t.info} className="rounded-2xl border border-slate-200 bg-white p-3.5">
                  <p className="mb-2 text-xs font-bold tracking-wide text-slate-500">{t.info}</p>
                  <ul className="space-y-1">
                    {infoLinks.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={() => setIsOpen(false)}
                          className="block rounded-lg px-3 py-2 text-slate-700 transition hover:bg-slate-100"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section aria-label={t.account} className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <p className="mb-2 text-xs font-bold tracking-wide text-slate-500">{t.account}</p>
                <ul className="space-y-1">
                  {accountActionLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        className="block rounded-lg px-3 py-2 text-slate-700 transition hover:bg-slate-100"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  {userSignedIn && logoutAction ? (
                    <li className="pt-2">
                      <form action={logoutAction}>
                        <button
                          type="submit"
                          className="block w-full rounded-lg bg-rose-50 px-3 py-2 text-right font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          {t.logout}
                        </button>
                      </form>
                    </li>
                  ) : null}
                </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
