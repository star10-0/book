"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/studio", label: "نظرة عامة" },
  { href: "/studio/books", label: "كتبي" },
  { href: "/studio/books/new", label: "+ كتاب جديد", highlight: true },
  { href: "/studio/orders", label: "الطلبات" },
  { href: "/studio/payments", label: "المدفوعات" },
  { href: "/studio/profile", label: "الملف العام" },
];

function isCurrentPath(pathname: string, href: string) {
  if (href === "/studio") {
    return pathname === href;
  }

  return pathname.startsWith(`${href}/`) || pathname === href;
}

export function StudioSidebar() {
  const pathname = usePathname();

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-500">لوحة الكاتب</h2>
      <nav aria-label="روابط لوحة الكاتب">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = isCurrentPath(pathname, item.href);
            const highlight = "highlight" in item && item.highlight;

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
