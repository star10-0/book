"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

type NavLink = {
  href: string;
  label: string;
};

type SiteDrawerNavProps = {
  primaryLinks: NavLink[];
  accountLinks: NavLink[];
  userSignedIn: boolean;
  canAccessStudio: boolean;
  canAccessAdmin: boolean;
  logoutAction?: () => Promise<void>;
};

export function SiteDrawerNav({
  primaryLinks,
  accountLinks,
  userSignedIn,
  canAccessStudio,
  canAccessAdmin,
  logoutAction,
}: SiteDrawerNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEscape);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="storefront-drawer"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        aria-label="فتح القائمة"
      >
        ☰
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50" aria-hidden={!isOpen}>
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45"
            onClick={() => setIsOpen(false)}
            aria-label="إغلاق القائمة"
          />

          <aside
            id="storefront-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-y-0 right-0 flex w-full max-w-xs flex-col border-l border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p id={titleId} className="text-sm font-bold text-slate-900">
                تصفح المتجر
              </p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto p-4 text-sm">
              <section aria-label="الفئات">
                <p className="mb-2 text-xs font-semibold text-slate-500">الفئات</p>
                <Link
                  href="/books"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2 font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  الكتب
                </Link>
              </section>

              <section aria-label="التنقل الرئيسي">
                <p className="mb-2 text-xs font-semibold text-slate-500">روابط سريعة</p>
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

              <section aria-label="الحساب">
                <p className="mb-2 text-xs font-semibold text-slate-500">الحساب</p>
                <ul className="space-y-1">
                  <li>
                    <Link
                      href={userSignedIn ? "/account" : "/login?callbackUrl=%2Faccount"}
                      onClick={() => setIsOpen(false)}
                      className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                    >
                      {userSignedIn ? "الحساب الشخصي" : "سجّل الدخول للمتابعة"}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={userSignedIn ? "/account/library" : "/login?callbackUrl=%2Faccount%2Flibrary"}
                      onClick={() => setIsOpen(false)}
                      className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                    >
                      مكتبتي
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={userSignedIn ? "/studio" : "/login?callbackUrl=%2Fstudio"}
                      onClick={() => setIsOpen(false)}
                      className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                    >
                      {userSignedIn ? "حساب الكاتب والأعمال" : "الترقية لوضع الكاتب"}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={userSignedIn ? "/account/profile" : "/login?callbackUrl=%2Faccount%2Fprofile"}
                      onClick={() => setIsOpen(false)}
                      className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                    >
                      الملف الشخصي
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={userSignedIn ? "/account/orders" : "/login?callbackUrl=%2Faccount%2Forders"}
                      onClick={() => setIsOpen(false)}
                      className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                    >
                      الطلبات
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
                          كتبي في الاستوديو
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/studio/profile"
                          onClick={() => setIsOpen(false)}
                          className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                        >
                          ملف الكاتب
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
                        الإدارة
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
                          تسجيل الخروج
                        </button>
                      </form>
                    </li>
                  ) : null}
                </ul>
              </section>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
