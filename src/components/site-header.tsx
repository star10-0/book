import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth-session";

const primaryLinks = [
  { href: "/", label: "الرئيسية" },
  { href: "/books", label: "الكتب" },
  { href: "/about", label: "عن المنصة" },
  { href: "/help", label: "المساعدة" },
  { href: "/contact", label: "تواصل معنا" },
];

const accountLinks = [
  { href: "/account", label: "الحساب" },
  { href: "/account/profile", label: "الملف الشخصي" },
  { href: "/account/orders", label: "طلباتي" },
  { href: "/account/library", label: "مكتبتي" },
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
              { href: "/studio/profile", label: "ملف الكاتب" },
            ]
          : [{ href: "/studio", label: "لوحة الكاتب" }]),
        ...(user.role === "ADMIN" ? [{ href: "/admin", label: "الإدارة" }] : []),
      ]
    : [];

  return (
    <header className="mb-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="bg-slate-900 px-4 py-2 text-xs text-slate-200 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium">Amjad | مكتبة رقمية عربية</p>
          <p className="hidden text-slate-300 sm:block">التصفح والبحث متاحان للجميع • تسجيل الدخول عند الإجراءات المحمية فقط</p>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <div className="grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)_auto] lg:items-center">
          <Link
            href="/"
            className="rounded-lg px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <p className="text-3xl font-extrabold leading-none tracking-tight text-slate-900">Amjad</p>
            <p className="mt-1 text-xs text-slate-500">مكتبة عربية رقمية</p>
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
                className="h-10 bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              >
                بحث
              </button>
            </div>
          </form>

          <div className="flex items-center gap-2 lg:justify-end">
            <div className="flex items-center overflow-hidden rounded-md border border-slate-300 text-[11px]" aria-label="تبديل اللغة">
              <Link href="?lang=ar" className="bg-slate-100 px-2 py-1 font-semibold text-slate-700 hover:bg-slate-200">
                AR
              </Link>
              <Link href="?lang=en" className="px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100">
                EN
              </Link>
            </div>

            {user ? (
              <>
                <Link
                  href="/account"
                  className="h-8 rounded-md bg-indigo-600 px-3 text-xs font-semibold leading-8 text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                >
                  حسابي
                </Link>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="h-8 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    خروج
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-8 items-center rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                تسجيل الدخول
              </Link>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/books" className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
            كل الكتب
          </Link>
          <Link href="/books?offer=buy" className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">
            شراء رقمي
          </Link>
          <Link href="/books?offer=rent" className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">
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
