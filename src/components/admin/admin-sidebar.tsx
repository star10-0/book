"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "نظرة عامة" },
  { href: "/admin/books", label: "الكتب" },
  { href: "/admin/categories", label: "التصنيفات" },
  { href: "/admin/authors", label: "المؤلفون" },
  { href: "/admin/orders", label: "الطلبات" },
  { href: "/admin/payments", label: "المدفوعات" },
  { href: "/admin/users", label: "المستخدمون" },
];

function isCurrentPath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname.startsWith(`${href}/`) || pathname === href;
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

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 ${
                    active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
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
