"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/studio", label: "نظرة عامة" },
  { href: "/studio/books", label: "كتبي" },
  { href: "/studio/books/new", label: "أضف كتابًا", highlight: true },
  { href: "/studio/orders", label: "الطلبات" },
  { href: "/studio/payments", label: "المدفوعات" },
  { href: "/studio/promo-codes", label: "أكواد الخصم" },
  { href: "/studio/analytics", label: "التحليلات" },
  { href: "/studio/profile", label: "ملف الكاتب" },
];

const onboardingItems = [
  { href: "/studio", label: "لوحة الكاتب" },
  { href: "/account/profile", label: "تفعيل ملف الكاتب" },
];

function isCurrentPath(pathname: string, href: string) {
  if (href === "/studio") {
    return pathname === href;
  }

  return pathname.startsWith(`${href}/`) || pathname === href;
}

type StudioSidebarProps = {
  isCreator: boolean;
};

export function StudioSidebar({ isCreator }: StudioSidebarProps) {
  const pathname = usePathname();
  const visibleItems = isCreator ? navItems : onboardingItems;

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-500">لوحة الكاتب</h2>
      <nav aria-label="روابط لوحة الكاتب">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
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
