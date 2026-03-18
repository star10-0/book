import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth-session";

const links = [
  { href: "/", label: "الرئيسية" },
  { href: "/books", label: "الكتب" },
  { href: "/account/orders", label: "طلباتي" },
  { href: "/account/library", label: "مكتبتي" },
  { href: "/account/rentals", label: "إعاراتي" },
  { href: "/admin", label: "لوحة الإدارة" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="mb-10 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <nav aria-label="التنقل الرئيسي" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-700">{user.name ?? user.email}</p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                تسجيل الخروج
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/auth/sign-in"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              تسجيل الدخول
            </Link>
            <Link href="/auth/sign-up" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500">
              إنشاء حساب
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
