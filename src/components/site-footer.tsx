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

const trustHighlights = ["دفع رقمي آمن", "وصول فوري للمكتبة", "دعم سريع باللغة العربية"];

export function SiteFooter() {
  return (
    <footer className="mt-6 rounded-3xl border border-slate-200 bg-white px-5 py-6 text-slate-700 shadow-sm sm:px-6 sm:py-7">
      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wide text-indigo-600">Amjad | المتجر الرقمي</p>
          <h2 className="text-lg font-bold text-slate-900">مكتبة رقمية عربية بوضوح وثقة</h2>
          <p className="max-w-md text-sm leading-6 text-slate-600">
            شراء أو استئجار الكتب الرقمية بخطوات واضحة، مع وصول مباشر إلى مكتبتك بعد إتمام الطلب.
          </p>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3 text-sm">
            <p className="font-semibold text-slate-900">الدعم المباشر</p>
            <a
              href="mailto:1234@gmail.com"
              className="mt-1 inline-flex items-center text-indigo-700 hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              1234@gmail.com
            </a>
            <p className="mt-1 text-xs text-slate-600">نستقبل استفسارات الطلبات، الوصول، والمدفوعات الرقمية.</p>
          </div>
        </div>

        <nav aria-label="روابط سريعة" className="space-y-2.5">
          <h3 className="text-sm font-semibold text-slate-900">روابط سريعة</h3>
          <ul className="space-y-1.5 text-sm text-slate-600">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-2.5">
          <nav aria-label="الدعم" className="space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-900">الدعم والمعلومات</h3>
            <ul className="space-y-1.5 text-sm text-slate-600">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-wrap gap-2 pt-1">
            {trustHighlights.map((item) => (
              <span key={item} className="store-chip h-7 border border-slate-200 bg-slate-50 px-2.5 text-slate-700">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Amjad. جميع الحقوق محفوظة.</p>
        <p className="mt-1 sm:mt-0">تجربة عربية أولًا — RTL افتراضي، عرض واضح، ودعم موثوق.</p>
      </div>
    </footer>
  );
}
