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
    <header className="mb-8 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="border-b border-slate-200 bg-slate-950 px-4 py-2 text-xs text-slate-100 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-indigo-200">متجر كتب رقمية عربي</p>
          <div className="flex flex-wrap items-center gap-3 text-slate-300">
            <span>شراء واستئجار كتب رقمية</span>
            <span aria-hidden>•</span>
            <span>وصول فوري إلى مكتبتك</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_auto] xl:items-center">
          <Link
            href="/"
            className="rounded-xl px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <p className="text-3xl font-extrabold tracking-tight text-slate-900">Book</p>
            <p className="text-xs font-medium text-slate-500">متجر الكتاب الرقمي العربي</p>
          </Link>

          <form action="/books" method="get" className="w-full">
            <div className="flex overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
              <div className="hidden items-center border-l border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 md:flex">
                البحث في المتجر
              </div>
              <input
                type="search"
                name="q"
                placeholder="ابحث عن كتاب، كاتب، أو تصنيف..."
                className="min-h-12 w-full border-0 px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                aria-label="البحث في الكتب"
              />
              <button
                type="submit"
                className="min-h-12 rounded-none bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              >
                بحث
              </button>
            </div>
          </form>

          {user ? (
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <p className="text-xs text-slate-500">مرحبًا</p>
                <p className="font-semibold text-slate-900">{user.name ?? user.email}</p>
              </div>
              <Link
                href="/account"
                className="min-h-10 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              >
                حسابي
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  تسجيل الخروج
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <Link
                href="/login"
                className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                className="min-h-10 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              >
                إنشاء حساب
              </Link>
            </div>
          )}
        </div>

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
          <Link href="/account/library" className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">
            مكتبتي
          </Link>
          <Link href="/account/orders" className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">
            تتبّع الطلبات
          </Link>
        </div>
      </div>

      <nav aria-label="التنقل الرئيسي" className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
        <ul className="flex min-w-max flex-wrap items-center gap-2 overflow-x-auto pb-1">
          {primaryLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex min-h-10 items-center rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
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
                className="inline-flex min-h-10 items-center rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
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
