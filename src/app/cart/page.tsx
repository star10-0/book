import Link from "next/link";
import { cookies } from "next/headers";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/auth-session";
import { CART_COOKIE_NAME, parseCartCookie } from "@/lib/cart";
import { formatArabicCurrency } from "@/lib/formatters/intl";
import { getStoreLocale } from "@/lib/locale";
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

  const cookieStore = await cookies();
  const cartItems = parseCartCookie(cookieStore.get(CART_COOKIE_NAME)?.value);
  const selectedFromQuery = bookId && offerId ? [{ bookId, offerId, quantity: 1 }] : [];
  const itemsToLoad = dedupeCartItems([...cartItems, ...selectedFromQuery]);

  const [user, locale, offers] = await Promise.all([
    getCurrentUser(),
    getStoreLocale(),
    itemsToLoad.length
      ? prisma.bookOffer.findMany({
          where: {
            id: { in: itemsToLoad.map((item) => item.offerId) },
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
      : Promise.resolve([]),
  ]);

  const offerById = new Map(offers.map((offer) => [offer.id, offer]));
  const cartEntries = itemsToLoad
    .map((item) => {
      const selectedOffer = offerById.get(item.offerId);

      if (!selectedOffer || selectedOffer.book.id !== item.bookId) {
        return null;
      }

      const isOfferAvailable = isOfferCurrentlyAvailable(selectedOffer, new Date());

      return {
        quantity: item.quantity,
        selectedOffer,
        isOfferAvailable,
        checkoutHref: isOfferAvailable ? `/checkout?bookId=${selectedOffer.book.id}&offerId=${selectedOffer.id}` : null,
      };
    })
    .filter((entry) => entry !== null);
  const cartTotalCents = cartEntries.reduce((sum, entry) => sum + entry.selectedOffer.priceCents, 0);
  const hasSingleCurrency = new Set(cartEntries.map((entry) => entry.selectedOffer.currency)).size <= 1;
  const cartCurrency = cartEntries[0]?.selectedOffer.currency;

  const normalizedReturnTo = returnTo?.startsWith("/") ? returnTo : "/books";

  const copy =
    locale === "en"
      ? {
          title: "Cart",
          description: "Review your selected items and continue to checkout.",
          browse: "Browse books",
          orders: "My orders",
          signIn: "Sign in",
          signInNote: "You need an account to create orders and complete checkout.",
          selectedTitle: "Selected items",
          selectedMeta: "Offer type",
          continueCheckout: "Continue to checkout",
          unavailable: "This offer is no longer available. Please select a different book offer.",
          backToBook: "Back to book",
          quantity: "Quantity",
          orderMode: "Each item creates a separate digital order.",
          cartTotal: "Estimated total",
          empty: "Your cart is currently empty.",
        }
      : {
          title: "السلة",
          description: "راجع العناصر المحددة ثم أكمل إنشاء الطلب من هنا عندما تكون جاهزًا.",
          browse: "تصفح الكتب",
          orders: "طلباتي",
          signIn: "تسجيل الدخول",
          signInNote: "تحتاج إلى تسجيل الدخول لإنشاء الطلبات وإكمال الدفع.",
          selectedTitle: "العناصر المحددة",
          selectedMeta: "نوع العرض",
          continueCheckout: "متابعة الإتمام",
          unavailable: "هذا العرض لم يعد متاحًا. اختر عرضًا آخر من صفحة الكتاب.",
          backToBook: "العودة إلى الكتاب",
          quantity: "الكمية",
          orderMode: "كل عنصر في السلة يُنشئ طلبًا رقميًا مستقلًا.",
          cartTotal: "الإجمالي التقديري",
          empty: "السلة فارغة حاليًا.",
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

        {cartEntries.length > 0 ? (
          <section className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-base font-bold text-slate-900">{copy.selectedTitle}</h2>
            {cartEntries.map((entry) => (
              <article key={`${entry.selectedOffer.id}-${entry.selectedOffer.book.id}`} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-800">{entry.selectedOffer.book.titleAr}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {entry.selectedOffer.book.author.nameAr} · {entry.selectedOffer.book.category.nameAr}
                </p>

                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-600">{copy.selectedMeta}</dt>
                    <dd className="font-semibold text-slate-900">
                      {entry.selectedOffer.type === "PURCHASE"
                        ? locale === "en"
                          ? "Digital purchase"
                          : "شراء رقمي"
                        : locale === "en"
                          ? `Digital rental${entry.selectedOffer.rentalDays ? ` (${entry.selectedOffer.rentalDays} days)` : ""}`
                          : `استئجار رقمي${entry.selectedOffer.rentalDays ? ` (${entry.selectedOffer.rentalDays} يوم)` : ""}`}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-600">{copy.quantity}</dt>
                    <dd className="font-semibold text-slate-900">{locale === "en" ? "1 (digital item)" : "1 (نسخة رقمية)"}</dd>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-600">{locale === "en" ? "Price" : "السعر"}</dt>
                    <dd className="font-bold text-indigo-700">
                      {formatArabicCurrency(entry.selectedOffer.priceCents / 100, { currency: entry.selectedOffer.currency })}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2.5">
                  {entry.checkoutHref ? (
                    user ? (
                      <Link href={entry.checkoutHref} className="store-btn-primary">
                        {copy.continueCheckout}
                      </Link>
                    ) : (
                      <Link href={`/login?callbackUrl=${encodeURIComponent(entry.checkoutHref)}`} className="store-btn-primary">
                        {copy.signIn}
                      </Link>
                    )
                  ) : (
                    <p className="text-xs font-semibold text-rose-700">{copy.unavailable}</p>
                  )}

                  <Link href={`/books/${entry.selectedOffer.book.slug}`} className="store-btn-secondary">
                    {copy.backToBook}
                  </Link>
                </div>
              </article>
            ))}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-600">{copy.orderMode}</p>
              {hasSingleCurrency && cartCurrency ? (
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
                  <p className="text-sm font-semibold text-slate-800">{copy.cartTotal}</p>
                  <p className="text-base font-black text-indigo-700">{formatArabicCurrency(cartTotalCents / 100, { currency: cartCurrency })}</p>
                </div>
              ) : (
                <p className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-600">
                  {locale === "en" ? "The cart includes multiple currencies; totals appear per item." : "تتضمن السلة أكثر من عملة؛ يظهر الإجمالي لكل عنصر على حدة."}
                </p>
              )}
            </div>

            {normalizedReturnTo !== "/cart" ? (
              <div className="pt-1">
                <Link href={normalizedReturnTo} className="store-btn-secondary">
                  {locale === "en" ? "Back" : "عودة"}
                </Link>
              </div>
            ) : null}
          </section>
        ) : (
          <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">{copy.empty}</p>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}

function dedupeCartItems(items: Array<{ bookId: string; offerId: string; quantity: number }>) {
  const unique = new Map<string, { bookId: string; offerId: string; quantity: number }>();

  for (const item of items) {
    const key = `${item.bookId}:${item.offerId}`;
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  return [...unique.values()];
}
