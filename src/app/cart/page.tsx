import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth-session";
import { getStoreLocale } from "@/lib/locale";

export default async function CartPage() {
  const [user, locale] = await Promise.all([getCurrentUser(), getStoreLocale()]);

  const copy =
    locale === "en"
      ? {
          title: "Cart",
          description: "Select an offer from any book page, then continue to checkout from that book.",
          browse: "Browse books",
          orders: "My orders",
          signIn: "Sign in",
          signInNote: "You need an account to create orders and complete checkout.",
        }
      : {
          title: "السلة",
          description: "اختر عرض شراء أو استئجار من صفحة أي كتاب، ثم أكمل إنشاء الطلب من نفس الصفحة.",
          browse: "تصفح الكتب",
          orders: "طلباتي",
          signIn: "تسجيل الدخول",
          signInNote: "تحتاج إلى تسجيل الدخول لإنشاء الطلبات وإكمال الدفع.",
        };

  return (
    <main>
      <SiteHeader />

      <section className="store-surface mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900">{copy.title}</h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">{copy.description}</p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link href="/books" className="store-btn-primary">
            {copy.browse}
          </Link>

          {user ? (
            <Link href="/account/orders" className="store-btn-secondary">
              {copy.orders}
            </Link>
          ) : (
            <>
              <Link href="/login?callbackUrl=%2Fcart" className="store-btn-secondary">
                {copy.signIn}
              </Link>
              <p className="w-full text-xs text-slate-500">{copy.signInNote}</p>
            </>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
