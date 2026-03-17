import Link from "next/link";

const links = [
  { href: "/", label: "الرئيسية" },
  { href: "/books", label: "الكتب" },
  { href: "/account/orders", label: "طلباتي" },
  { href: "/admin", label: "لوحة الإدارة" },
];

export function SiteHeader() {
  return (
    <header className="mb-10 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <nav aria-label="التنقل الرئيسي" className="flex flex-wrap items-center gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
