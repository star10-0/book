import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth-session";
import { SiteDrawerNav } from "@/components/site-drawer-nav";

const primaryLinks = [
  { href: "/", label: "الرئيسية" },
  { href: "/books", label: "الكتب" },
  { href: "/about", label: "عن المنصة" },
  { href: "/help", label: "المساعدة" },
  { href: "/contact", label: "تواصل معنا" },
];

const accountLinks = [
  { href: "/account", label: "الحساب" },
  { href: "/account/library", label: "مكتبتي" },
  { href: "/account/rentals", label: "إعاراتي" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  const accountNavigation = user
    ? [
        ...accountLinks,
        { href: "/studio", label: "لوحة الكاتب" },
      ]
    : [];
  const canAccessStudio = user?.role === "CREATOR" || user?.role === "ADMIN";
  const canAccessAdmin = user?.role === "ADMIN";

  return (
    <header className="mb-6 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="bg-slate-950 px-4 py-1.5 text-[11px] text-slate-200 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Link href="/checkout" className="rounded bg-slate-800 px-2 py-1 font-semibold text-slate-100 hover:bg-slate-700">
              السلة
            </Link>
            <p className="font-medium text-slate-300">متجر رقمي عربي</p>
          </div>
          <p className="hidden text-slate-400 sm:block">شراء واستئجار الكتب الرقمية • واجهة عربية RTL</p>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <div className="grid gap-3.5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          <Link
            href="/"
            className="rounded-lg px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <p className="text-3xl font-black leading-none tracking-tight text-slate-900 sm:text-4xl">أمجد</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Amjad</p>
          </Link>

          <form action="/books" method="get" className="w-full">
            <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
              <input
                type="search"
                name="q"
                placeholder="ابحث عن كتاب، كاتب، أو تصنيف..."
                className="h-10 w-full border-0 px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                aria-label="البحث في الكتب"
              />
              <button
                type="submit"
                className="h-10 bg-indigo-600 px-4 text-xs font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              >
                بحث
              </button>
            </div>
          </form>

          <div className="flex items-center gap-2 lg:justify-end">
            <SiteDrawerNav
              primaryLinks={primaryLinks}
              accountLinks={accountNavigation}
              userSignedIn={Boolean(user)}
              canAccessStudio={canAccessStudio}
              canAccessAdmin={canAccessAdmin}
              logoutAction={signOutAction}
            />

            <details className="group relative">
              <summary className="inline-flex h-9 cursor-pointer list-none items-center rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
                اللغة
              </summary>
              <div className="absolute end-0 top-10 z-20 w-28 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                <Link href="?lang=ar" className="block rounded px-2 py-1.5 text-xs hover:bg-slate-100">
                  العربية
                </Link>
                <Link href="?lang=en" className="mt-1 block rounded px-2 py-1.5 text-xs hover:bg-slate-100">
                  English
                </Link>
              </div>
            </details>

            <Link href="/checkout" className="store-btn-secondary h-9 px-3">
              السلة
            </Link>

            {user ? (
              <Link href="/account" className="store-btn-primary">
                حسابي
              </Link>
            ) : (
              <Link href="/login" className="store-btn-secondary">
                تسجيل الدخول
              </Link>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/books" className="store-chip bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
            كل الكتب
          </Link>
          <Link href="/books?offer=buy" className="store-chip bg-slate-100 text-slate-700 hover:bg-slate-200">
            شراء رقمي
          </Link>
          <Link href="/books?offer=rent" className="store-chip bg-slate-100 text-slate-700 hover:bg-slate-200">
            استئجار رقمي
          </Link>
        </div>
      </div>

      <nav aria-label="التنقل الرئيسي" className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 sm:px-5">
        <ul className="flex min-w-max flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
          {primaryLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-slate-700 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {link.label}
              </Link>
            </li>
          ))}

          {accountNavigation.length > 0 ? <li aria-hidden className="mx-1 h-4 w-px bg-slate-300" /> : null}

          {accountNavigation.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-slate-700 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
