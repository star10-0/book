"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "نظرة عامة" },
  { href: "/admin/payments?scope=issues", label: "تنبيهات الدفع", quick: true },
  { href: "/admin/users?scope=suspicious", label: "حسابات مشبوهة", quick: true },
  { href: "/admin/books?status=PENDING_REVIEW", label: "مراجعة الكتب", quick: true },
  { href: "/admin/books", label: "الكتب" },
  { href: "/admin/books/new", label: "+ إضافة كتاب", highlight: true },
  { href: "/admin/categories", label: "التصنيفات" },
  { href: "/admin/authors", label: "المؤلفون" },
  { href: "/admin/orders", label: "الطلبات" },
  { href: "/admin/payments", label: "المدفوعات" },
  { href: "/admin/promo-codes", label: "أكواد الخصم" },
  { href: "/admin/curriculum", label: "المنهاج" },
  { href: "/admin/users", label: "المستخدمون" },
];

function isCurrentPath(pathname: string, href: string) {
  const baseHref = href.split("?")[0];

  if (baseHref === "/admin") {
    return pathname === baseHref;
  }

  return pathname.startsWith(`${baseHref}/`) || pathname === baseHref;
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-500">لوحة الإدارة</h2>
      <nav aria-label="روابط الإدارة">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = isCurrentPath(pathname, item.href);
            const highlight = "highlight" in item && item.highlight;
            const quick = "quick" in item && item.quick;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 ${
                    active
                      ? "bg-slate-900 text-white focus-visible:ring-slate-500"
                      : highlight
                        ? "bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-500"
                        : quick
                          ? "text-amber-800 bg-amber-50 hover:bg-amber-100 focus-visible:ring-amber-500"
                          : "text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-500"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
