"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
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
};

export function SiteDrawerNav({
  locale,
  primaryLinks,
  accountLinks,
  userSignedIn,
  canAccessStudio,
  canAccessAdmin,
  logoutAction,
}: SiteDrawerNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const t =
    locale === "en"
      ? {
          openMenu: "Open menu",
          closeMenu: "Close menu",
          browseStore: "Browse store",
          categories: "Categories",
          books: "Books",
          quickLinks: "Quick links",
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
          categories: "الفئات",
          books: "الكتب",
          quickLinks: "روابط سريعة",
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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    window.addEventListener("mousedown", onPointerDown);

    return () => {
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-sm text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        aria-label={isOpen ? t.closeMenu : t.openMenu}
      >
        ☰
      </button>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={titleId}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="border-b border-slate-200 px-4 py-3">
            <p id={titleId} className="text-sm font-bold text-slate-900">
              {t.browseStore}
            </p>
          </div>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4 text-sm">
            <section aria-label={t.categories}>
              <p className="mb-2 text-xs font-semibold text-slate-500">{t.categories}</p>
              <Link
                href="/books"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2 font-medium text-indigo-700 hover:bg-indigo-100"
              >
                {t.books}
              </Link>
            </section>

            <section aria-label={t.quickLinks}>
              <p className="mb-2 text-xs font-semibold text-slate-500">{t.quickLinks}</p>
              <ul className="space-y-1">
                {primaryLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label={t.account}>
              <p className="mb-2 text-xs font-semibold text-slate-500">{t.account}</p>
              <ul className="space-y-1">
                <li>
                  <Link
                    href={userSignedIn ? "/account" : "/login?callbackUrl=%2Faccount"}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                  >
                    {userSignedIn ? t.accountHome : t.signIn}
                  </Link>
                </li>
                <li>
                  <Link
                    href={userSignedIn ? "/account/library" : "/login?callbackUrl=%2Faccount%2Flibrary"}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                  >
                    {t.myLibrary}
                  </Link>
                </li>
                <li>
                  <Link
                    href={userSignedIn ? "/studio" : "/login?callbackUrl=%2Fstudio"}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                  >
                    {t.creator}
                  </Link>
                </li>
                <li>
                  <Link
                    href={userSignedIn ? "/account/profile" : "/login?callbackUrl=%2Faccount%2Fprofile"}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                  >
                    {t.profile}
                  </Link>
                </li>
                <li>
                  <Link
                    href={userSignedIn ? "/account/orders" : "/login?callbackUrl=%2Faccount%2Forders"}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                  >
                    {t.orders}
                  </Link>
                </li>
                {accountLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {canAccessStudio ? (
                  <>
                    <li>
                      <Link
                        href="/studio/books"
                        onClick={() => setIsOpen(false)}
                        className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                      >
                        {t.studioBooks}
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/studio/profile"
                        onClick={() => setIsOpen(false)}
                        className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                      >
                        {t.studioProfile}
                      </Link>
                    </li>
                  </>
                ) : null}
                {canAccessAdmin ? (
                  <li>
                    <Link
                      href="/admin"
                      onClick={() => setIsOpen(false)}
                      className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                    >
                      {t.admin}
                    </Link>
                  </li>
                ) : null}
                {userSignedIn && logoutAction ? (
                  <li className="pt-2">
                    <form action={logoutAction}>
                      <button
                        type="submit"
                        className="block w-full rounded-md bg-rose-50 px-3 py-2 text-right font-medium text-rose-700 hover:bg-rose-100"
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
      ) : null}
    </div>
  );
}
