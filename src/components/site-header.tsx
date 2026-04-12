import Link from "next/link";
import { SiteHeaderTabLink } from "@/components/site-header-tab-link";
import { cookies } from "next/headers";
import { signOutAction } from "@/app/auth/actions";
import { SiteDrawerNav } from "@/components/site-drawer-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { CartLink } from "@/components/cart-link";
import { getCurrentUser } from "@/lib/auth-session";
import { getStoreLocale } from "@/lib/locale";
import { CART_COOKIE_NAME, getCartItemsCount, parseCartCookie } from "@/lib/cart";
import { StorefrontHeaderShell } from "@/components/storefront-header-shell";

const translations = {
  ar: {
    brandSub: "Amjad",
    home: "الرئيسية",
    books: "الكتب",
    catalog: "الدليل",
    curriculum: "المنهاج",
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
    all: "الكل",
    cart: "السلة",
    myAccount: "حسابي",
    signIn: "تسجيل الدخول",
  },
  en: {
    brandSub: "Amjad",
    home: "Home",
    books: "Books",
    catalog: "Catalog",
    curriculum: "Curriculum",
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
    all: "All",
    cart: "Cart",
    myAccount: "My Account",
    signIn: "Sign In",
  },
} as const;

export async function SiteHeader() {
  const [user, locale, cookieStore] = await Promise.all([getCurrentUser(), getStoreLocale(), cookies()]);
  const t = translations[locale];
  const cartCount = getCartItemsCount(parseCartCookie(cookieStore.get(CART_COOKIE_NAME)?.value));

  const primaryLinks = [
    { href: "/", label: t.home },
    { href: "/books", label: t.books },
    { href: "/catalog", label: t.catalog },
    { href: "/curriculum", label: t.curriculum },
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
  const topControlButtonClassName =
    "inline-flex h-10 items-center justify-center rounded-lg border border-slate-600/80 bg-slate-900/85 px-3.5 text-xs font-semibold text-slate-100 transition-colors duration-200 hover:border-slate-500 hover:bg-slate-800/95 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300";
  const primaryAccountButtonClassName =
    "inline-flex h-10 items-center justify-center rounded-lg border border-amber-200/35 bg-amber-200/10 px-3.5 text-xs font-semibold text-amber-100 transition-colors duration-200 hover:border-amber-100/45 hover:bg-amber-200/15 hover:text-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200";

  return (
    <StorefrontHeaderShell>
      <header className="w-full overflow-visible border-b border-slate-700/80 bg-gradient-to-b from-slate-950 to-slate-900 text-white shadow-[0_14px_32px_-24px_rgba(2,6,23,1)]">
        <div className="border-b border-slate-700/60 bg-[linear-gradient(180deg,rgba(148,163,184,0.05)_0%,rgba(15,23,42,0)_100%)] px-2.5 py-2.5 sm:px-3.5 sm:py-3">
          <div className="grid items-center gap-2.5 lg:grid-cols-[minmax(9rem,11rem)_minmax(0,1fr)_minmax(13rem,auto)] lg:gap-3">
            <div className="flex min-w-0 items-center justify-start">
              <Link
                href="/"
                className="inline-flex min-h-10 min-w-[8.25rem] flex-col justify-center rounded-xl border border-slate-600/80 bg-slate-900/80 px-3 py-1.5 transition-colors hover:border-slate-500/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <p className="text-[1.32rem] font-black leading-none tracking-tight text-white sm:text-[1.45rem]">أمجد</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">{t.brandSub}</p>
              </Link>
            </div>

            <form action="/books" method="get" className="order-last w-full lg:order-none lg:mx-auto lg:max-w-3xl">
              <div className="flex overflow-hidden rounded-xl border border-slate-600/85 bg-slate-900/60 ring-1 ring-slate-700/70 transition-colors duration-200 focus-within:border-amber-300/55 focus-within:ring-amber-200/30">
                <span className="inline-flex h-10 shrink-0 items-center border-s border-slate-700/90 bg-slate-800/95 px-3 text-[11px] font-semibold text-slate-200 sm:px-3.5">
                  {t.all}
                </span>
                <input
                  type="search"
                  name="q"
                  placeholder={t.searchPlaceholder}
                  className="h-10 w-full border-0 bg-transparent px-3.5 text-sm text-slate-50 outline-none placeholder:text-slate-400"
                  aria-label={t.searchAria}
                />
                <button type="submit" className="h-10 border-s border-amber-200/35 bg-amber-300/90 px-4 text-xs font-bold text-slate-950 transition-colors duration-200 hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 sm:px-5">
                  {t.searchCta}
                </button>
              </div>
            </form>

            <div className="flex items-center justify-end gap-1.5 lg:gap-2">
              <LanguageSwitcher locale={locale} />

              <CartLink href="/cart" className={topControlButtonClassName} label={t.cart} initialCount={cartCount} />

              {user ? (
                <Link href="/account" className={primaryAccountButtonClassName}>
                  {t.myAccount}
                </Link>
              ) : (
                <Link href="/login" className={topControlButtonClassName}>
                  {t.signIn}
                </Link>
              )}
            </div>
          </div>
        </div>

        <nav aria-label="التنقل الرئيسي" className="border-t border-slate-800/80 bg-slate-900/95 px-2.5 py-2 sm:px-3.5">
          <ul className="flex min-w-0 flex-wrap items-center gap-1 overflow-x-auto py-px">
            <li>
              <SiteDrawerNav
                locale={locale}
                primaryLinks={primaryLinks}
                accountLinks={accountNavigation}
                userSignedIn={Boolean(user)}
                canAccessStudio={canAccessStudio}
                canAccessAdmin={canAccessAdmin}
                logoutAction={signOutAction}
                triggerLabel={t.all}
                triggerClassName="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-700/90 bg-slate-800/90 px-2.5 text-xs font-medium text-slate-100 transition-colors duration-200 hover:border-slate-600 hover:bg-slate-700/95 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                triggerIconClassName="text-[0.9rem] leading-none"
              />
            </li>
            {primaryLinks.map((link) => (
              <li key={link.href}>
                <SiteHeaderTabLink href={link.href} label={link.label} />
              </li>
            ))}

            {accountNavigation.length > 0 ? <li aria-hidden className="mx-0.5 h-4 w-px bg-slate-600" /> : null}

            {accountNavigation.map((link) => (
              <li key={link.href}>
                <SiteHeaderTabLink href={link.href} label={link.label} />
              </li>
            ))}
          </ul>
        </nav>
      </header>
    </StorefrontHeaderShell>
  );
}
