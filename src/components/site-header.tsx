import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { SiteDrawerNav } from "@/components/site-drawer-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getCurrentUser } from "@/lib/auth-session";
import { getStoreLocale } from "@/lib/locale";

const translations = {
  ar: {
    brandSub: "Amjad",
    home: "الرئيسية",
    books: "الكتب",
    about: "عن المنصة",
    help: "المساعدة",
    contact: "تواصل معنا",
    account: "الحساب",
    library: "مكتبتي",
    rentals: "إعاراتي",
    studio: "لوحة الكاتب",
    searchPlaceholder: "ابحث عن كتاب، كاتب، أو تصنيف...",
    searchAria: "البحث في الكتب",
    searchCta: "بحث",
    allBooks: "كل الكتب",
    digitalBuy: "شراء رقمي",
    digitalRent: "استئجار رقمي",
    cart: "السلة",
    myAccount: "حسابي",
    signIn: "تسجيل الدخول",
  },
  en: {
    brandSub: "Amjad",
    home: "Home",
    books: "Books",
    about: "About",
    help: "Help",
    contact: "Contact",
    account: "Account",
    library: "My Library",
    rentals: "My Rentals",
    studio: "Creator Studio",
    searchPlaceholder: "Search by title, author, or category...",
    searchAria: "Search books",
    searchCta: "Search",
    allBooks: "All Books",
    digitalBuy: "Buy Digital",
    digitalRent: "Rent Digital",
    cart: "Cart",
    myAccount: "My Account",
    signIn: "Sign In",
  },
} as const;

export async function SiteHeader() {
  const [user, locale] = await Promise.all([getCurrentUser(), getStoreLocale()]);
  const t = translations[locale];

  const primaryLinks = [
    { href: "/", label: t.home },
    { href: "/books", label: t.books },
    { href: "/about", label: t.about },
    { href: "/help", label: t.help },
    { href: "/contact", label: t.contact },
  ];

  const accountLinks = [
    { href: "/account", label: t.account },
    { href: "/account/library", label: t.library },
    { href: "/account/rentals", label: t.rentals },
  ];

  const accountNavigation = user ? [...accountLinks, { href: "/studio", label: t.studio }] : [];
  const canAccessStudio = user?.role === "CREATOR" || user?.role === "ADMIN";
  const canAccessAdmin = user?.role === "ADMIN";

  return (
    <header className="sticky top-1 z-40 mb-2 overflow-visible rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 sm:mb-3">
      <div className="px-3 py-1.5 sm:px-4 sm:py-2">
        <div className="grid items-start gap-1.5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-2.5">
          <div className="flex w-fit flex-col items-end gap-1 sm:gap-1.5">
            <Link
              href="/"
              className="rounded-lg px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <p className="text-[1.45rem] font-black leading-none tracking-tight text-slate-900 sm:text-[1.6rem]">أمجد</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-600">{t.brandSub}</p>
            </Link>

            <div className="w-full border-t border-slate-200 pt-1">
              <SiteDrawerNav
                locale={locale}
                primaryLinks={primaryLinks}
                accountLinks={accountNavigation}
                userSignedIn={Boolean(user)}
                canAccessStudio={canAccessStudio}
                canAccessAdmin={canAccessAdmin}
                logoutAction={signOutAction}
              />
            </div>
          </div>

          <form action="/books" method="get" className="order-last w-full lg:order-none">
            <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm ring-1 ring-transparent transition focus-within:border-indigo-500 focus-within:ring-indigo-100 lg:border-indigo-200/80 lg:shadow">
              <input
                type="search"
                name="q"
                placeholder={t.searchPlaceholder}
                className="h-9 w-full border-0 px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                aria-label={t.searchAria}
              />
              <button
                type="submit"
                className="h-9 bg-indigo-600 px-3.5 text-xs font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              >
                {t.searchCta}
              </button>
            </div>
          </form>

          <div className="flex items-center gap-1 lg:justify-end">
            <LanguageSwitcher locale={locale} />

            <Link href="/cart" className="store-btn-secondary h-8 px-2.5 text-xs sm:px-3">
              {t.cart}
            </Link>

            {user ? (
              <Link href="/account" className="store-btn-primary h-8 px-2.5 text-xs sm:px-3">
                {t.myAccount}
              </Link>
            ) : (
              <Link href="/login" className="store-btn-secondary h-8 px-2.5 text-xs sm:px-3">
                {t.signIn}
              </Link>
            )}
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <Link href="/books" className="store-chip h-7 px-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
            {t.allBooks}
          </Link>
          <Link href="/books?offer=buy" className="store-chip h-7 px-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200">
            {t.digitalBuy}
          </Link>
          <Link href="/books?offer=rent" className="store-chip h-7 px-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200">
            {t.digitalRent}
          </Link>
        </div>
      </div>

      <nav aria-label="التنقل الرئيسي" className="border-t border-slate-200 bg-slate-50/90 px-3 py-0.5 sm:px-4">
        <ul className="flex min-w-0 flex-wrap items-center gap-0.5 overflow-x-auto py-0.5">
          {primaryLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex h-6 items-center rounded-md px-2 text-xs font-medium text-slate-700 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {link.label}
              </Link>
            </li>
          ))}

          {accountNavigation.length > 0 ? <li aria-hidden className="mx-0.5 h-4 w-px bg-slate-300" /> : null}

          {accountNavigation.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex h-6 items-center rounded-md px-2 text-xs font-medium text-slate-700 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
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
