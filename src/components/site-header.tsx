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
  { href: "/account/orders", label: "طلباتي" },
  { href: "/account/library", label: "مكتبتي" },
  { href: "/account/rentals", label: "إعاراتي" },
  { href: "/admin", label: "الإدارة" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="mb-8 rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-slate-200 backdrop-blur sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <Link href="/" className="rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
          <p className="text-lg font-extrabold tracking-tight text-slate-900">Book</p>
          <p className="text-xs text-slate-500">مكتبة رقمية عربية</p>
        </Link>

        {user ? (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <p className="text-sm font-medium text-slate-700">{user.name ?? user.email}</p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                تسجيل الخروج
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/auth/sign-in"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/auth/sign-up"
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              إنشاء حساب
            </Link>
          </div>
        )}
      </div>

      <nav aria-label="التنقل الرئيسي" className="mt-4 flex flex-wrap items-center gap-2">
        {primaryLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {link.label}
          </Link>
        ))}

        {user ? <span className="mx-1 h-4 w-px bg-slate-300" /> : null}

        {user
          ? accountLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {link.label}
              </Link>
            ))
          : null}
      </nav>
    </header>
  );
}
