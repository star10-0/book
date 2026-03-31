import Link from "next/link";

const quickLinks = [
  { href: "/books", label: "تصفّح الكتب" },
  { href: "/account/library", label: "مكتبتي" },
  { href: "/account/orders", label: "طلباتي" },
];

const supportLinks = [
  { href: "/help", label: "مركز المساعدة" },
  { href: "/contact", label: "تواصل معنا" },
  { href: "/about", label: "عن المنصة" },
];

export function SiteFooter() {
  return (
    <footer className="mt-8 rounded-3xl bg-gradient-to-l from-slate-950 via-slate-900 to-indigo-950 px-6 py-8 text-slate-100 shadow-lg sm:px-8 sm:py-10">
      <div className="grid gap-8 md:grid-cols-[1.3fr_1fr_1fr]">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-indigo-300">Amjad</p>
          <h2 className="text-2xl font-bold">واجهة تسوق عربية للكتب الرقمية</h2>
          <p className="max-w-md text-sm leading-7 text-slate-300">
            اكتشف عناوين جديدة، قارن بين خيارات الشراء والاستئجار، وانتقل مباشرة إلى مكتبتك الشخصية بعد الدفع.
          </p>
        </div>

        <nav aria-label="روابط سريعة" className="space-y-3">
          <h3 className="text-base font-semibold text-white">روابط سريعة</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="الدعم" className="space-y-3">
          <h3 className="text-base font-semibold text-white">الدعم والمعلومات</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {supportLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mt-8 border-t border-slate-800 pt-5 text-xs text-slate-400 sm:flex sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Amjad. جميع الحقوق محفوظة.</p>
        <p className="mt-2 sm:mt-0">تجربة متجر عربي أولًا — RTL افتراضي، تسوق أسرع، وشراء بثقة.</p>
      </div>
    </footer>
  );
}
