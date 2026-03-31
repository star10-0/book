import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/auth-session";
import { getStoreLocale } from "@/lib/locale";
import { formatArabicCurrency } from "@/lib/formatters/intl";
import { isOfferCurrentlyAvailable } from "@/lib/orders/create-order";
import { prisma } from "@/lib/prisma";

type CartPageProps = {
  searchParams?: Promise<{ bookId?: string; offerId?: string; returnTo?: string }>;
};

export default async function CartPage({ searchParams }: CartPageProps) {
  const params = (await searchParams) ?? {};
  const bookId = params.bookId?.trim();
  const offerId = params.offerId?.trim();
  const returnTo = params.returnTo?.trim();

  const [user, locale, selectedOffer] = await Promise.all([
    getCurrentUser(),
    getStoreLocale(),
    bookId && offerId
      ? prisma.bookOffer.findFirst({
          where: {
            id: offerId,
            bookId,
          },
          include: {
            book: {
              select: {
                id: true,
                slug: true,
                titleAr: true,
                status: true,
                format: true,
                author: { select: { nameAr: true } },
                category: { select: { nameAr: true } },
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const isOfferAvailable = selectedOffer ? isOfferCurrentlyAvailable(selectedOffer, new Date()) : false;
  const checkoutHref = selectedOffer && isOfferAvailable ? `/checkout?bookId=${selectedOffer.book.id}&offerId=${selectedOffer.id}` : null;
  const normalizedReturnTo = returnTo?.startsWith("/") ? returnTo : "/books";

  const copy =
    locale === "en"
      ? {
          title: "Cart",
          description: "Select an offer from any book page, then continue to checkout from that book.",
          browse: "Browse books",
          orders: "My orders",
          signIn: "Sign in",
          signInNote: "You need an account to create orders and complete checkout.",
          selectedTitle: "Selected item",
          selectedMeta: "Offer type",
          continueCheckout: "Continue to checkout",
          unavailable: "This offer is no longer available. Please select a different book offer.",
          backToBook: "Back to book",
        }
      : {
          title: "السلة",
          description: "اختر عرض شراء أو استئجار من صفحة أي كتاب، ثم أكمل إنشاء الطلب من نفس الصفحة.",
          browse: "تصفح الكتب",
          orders: "طلباتي",
          signIn: "تسجيل الدخول",
          signInNote: "تحتاج إلى تسجيل الدخول لإنشاء الطلبات وإكمال الدفع.",
          selectedTitle: "العنصر المحدد",
          selectedMeta: "نوع العرض",
          continueCheckout: "متابعة الإتمام",
          unavailable: "هذا العرض لم يعد متاحًا. اختر عرضًا آخر من صفحة الكتاب.",
          backToBook: "العودة إلى الكتاب",
        };

  return (
    <main>

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

        {selectedOffer ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-base font-bold text-slate-900">{copy.selectedTitle}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-800">{selectedOffer.book.titleAr}</p>
            <p className="mt-1 text-xs text-slate-600">
              {selectedOffer.book.author.nameAr} · {selectedOffer.book.category.nameAr}
            </p>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-600">{copy.selectedMeta}</dt>
                <dd className="font-semibold text-slate-900">
                  {selectedOffer.type === "PURCHASE"
                    ? locale === "en"
                      ? "Digital purchase"
                      : "شراء رقمي"
                    : locale === "en"
                      ? `Digital rental${selectedOffer.rentalDays ? ` (${selectedOffer.rentalDays} days)` : ""}`
                      : `استئجار رقمي${selectedOffer.rentalDays ? ` (${selectedOffer.rentalDays} يوم)` : ""}`}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-600">{locale === "en" ? "Price" : "السعر"}</dt>
                <dd className="font-bold text-indigo-700">{formatArabicCurrency(selectedOffer.priceCents / 100, { currency: selectedOffer.currency })}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2.5">
              {checkoutHref ? (
                user ? (
                  <Link href={checkoutHref} className="store-btn-primary">
                    {copy.continueCheckout}
                  </Link>
                ) : (
                  <Link href={`/login?callbackUrl=${encodeURIComponent(checkoutHref)}`} className="store-btn-primary">
                    {copy.signIn}
                  </Link>
                )
              ) : (
                <p className="text-xs font-semibold text-rose-700">{copy.unavailable}</p>
              )}
              <Link href={`/books/${selectedOffer.book.slug}`} className="store-btn-secondary">
                {copy.backToBook}
              </Link>
              {normalizedReturnTo !== `/books/${selectedOffer.book.slug}` ? (
                <Link href={normalizedReturnTo} className="store-btn-secondary">
                  {locale === "en" ? "Back" : "عودة"}
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}
      </section>

      <SiteFooter />
    </main>
  );
}
