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
};

export function SiteDrawerNav({ primaryLinks, accountLinks, userSignedIn }: SiteDrawerNavProps) {
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
        className="store-btn-secondary"
      >
        القائمة
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
                      href={userSignedIn ? "/account/profile" : "/login"}
                      onClick={() => setIsOpen(false)}
                      className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                    >
                      {userSignedIn ? "الملف الشخصي" : "تسجيل الدخول"}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/studio"
                      onClick={() => setIsOpen(false)}
                      className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                    >
                      التحويل إلى وضع الكاتب
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
                </ul>
              </section>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
