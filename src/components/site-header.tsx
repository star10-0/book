import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth-session";

const primaryLinks = [
  { href: "/", label: "الرئيسية" },
  { href: "/books", label: "الكتب" },
  { href: "/books?offer=buy", label: "شراء" },
  { href: "/books?offer=rent", label: "استئجار" },
  { href: "/books?category=all", label: "التصنيفات" },
];

const accountLinks = [
  { href: "/account", label: "الحساب" },
  { href: "/account/library", label: "مكتبتي" },
  { href: "/account/orders", label: "طلباتي" },
  { href: "/account/rentals", label: "إعاراتي" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  const accountNavigation = user
    ? [
        ...accountLinks,
        ...(user.role === "CREATOR" || user.role === "ADMIN"
          ? [
              { href: "/studio", label: "لوحة الكاتب" },
              { href: "/studio/books/new", label: "أضف كتابًا" },
            ]
          : []),
        ...(user.role === "ADMIN" ? [{ href: "/admin", label: "الإدارة" }] : []),
      ]
    : [];

  return (
    <header className="mb-8 rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
        <Link
          href="/"
          className="rounded-lg px-1 py-0.5 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <p className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Amjad</p>
          <p className="text-[11px] font-medium text-slate-500 sm:text-xs">متجر الكتاب الرقمي العربي</p>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="تبديل اللغة بين العربية والإنجليزية"
            className="h-8 rounded-md border border-slate-300 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            AR | EN
          </button>

          {user ? (
            <>
              <Link
                href="/account"
                className="h-8 rounded-md border border-slate-300 px-3 text-xs font-semibold leading-8 text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                حسابي
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="h-8 rounded-md bg-indigo-600 px-3 text-xs font-semibold leading-8 text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                >
                  خروج
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="h-8 rounded-md bg-indigo-600 px-3 text-xs font-semibold leading-8 text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              تسجيل الدخول
            </Link>
          )}
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <form action="/books" method="get" className="w-full">
          <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
            <input
              type="search"
              name="q"
              placeholder="ابحث عن كتاب، كاتب، أو تصنيف..."
              className="h-10 w-full border-0 px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              aria-label="البحث في المتجر"
            />
            <button
              type="submit"
              className="h-10 border-r border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              بحث
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/books" className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
            أحدث الكتب
          </Link>
          <Link href="/books?offer=buy" className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">
            شراء
          </Link>
          <Link href="/books?offer=rent" className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">
            استئجار
          </Link>
          <Link href="/books?sort=rating" className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">
            الأعلى تقييمًا
          </Link>
        </div>
      </div>

      <nav aria-label="التنقل الرئيسي" className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
        <ul className="flex min-w-max flex-wrap items-center gap-2 overflow-x-auto pb-1">
          {primaryLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
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
                className="inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
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
