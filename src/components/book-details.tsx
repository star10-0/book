import Link from "next/link";
import type { BookOffer, OfferType } from "@prisma/client";
import { formatArabicCurrency } from "@/lib/formatters/intl";
import { OrderSummaryCard } from "@/components/order-summary-card";
import { submitReviewAction, toggleWishlistAction } from "@/app/books/[slug]/actions";
import { CoverImage } from "@/components/ui/cover-image";


const offerLabelByType: Record<OfferType, string> = {
  PURCHASE: "شراء رقمي",
  RENTAL: "استئجار رقمي",
};

type BookDetailsProps = {
  book: {
    id: string;
    slug: string;
    title: string;
    author: string;
    category: string;
    description: string | null;
    coverImageUrl: string | null;
    publicationDate: Date | null;
    metadata: unknown;
    publicReadUrl: string | null;
    publicReadLabel: string | null;
    publicDownloadUrl: string | null;
    accessGuidance?: string | null;
    contentStateNote?: string | null;
  };
  offers: Pick<BookOffer, "id" | "type" | "priceCents" | "currency" | "rentalDays">[];
  averageRating: number;
  reviewsCount: number;
  isLoggedIn: boolean;
  isWishlisted: boolean;
  userReview: {
    rating: number;
    comment: string | null;
  } | null;
};

type ReviewsSectionProps = {
  bookId: string;
  slug: string;
  averageRating: number;
  reviewsCount: number;
  isLoggedIn: boolean;
  userReview: {
    rating: number;
    comment: string | null;
  } | null;
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    userName: string;
  }[];
};

type RelatedBooksProps = {
  books: {
    id: string;
    slug: string;
    title: string;
    author: string;
    coverImageUrl: string | null;
  }[];
};

export function BookDetailsSection({
  book,
  offers,
  averageRating,
  reviewsCount,
  isLoggedIn,
  isWishlisted,
  userReview,
}: BookDetailsProps) {
  return (
    <section aria-labelledby="book-details-title" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <div>
          <CoverImage
            src={book.coverImageUrl}
            alt={`غلاف كتاب ${book.title}`}
            width={640}
            height={960}
            className="h-auto w-full rounded-2xl object-cover shadow-sm ring-1 ring-slate-200"
            priority
          />
        </div>

        <div className="space-y-6">
          <header className="space-y-3">
            <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {book.category}
            </span>
            <h1 id="book-details-title" className="text-3xl font-bold text-slate-900 sm:text-4xl">
              {book.title}
            </h1>
            <p className="text-base text-slate-700">تأليف: {book.author}</p>
            <p className="text-sm font-semibold text-amber-600">
              {averageRating > 0 ? `★ ${averageRating.toFixed(1)} من 5 (${reviewsCount} مراجعة)` : "لا توجد تقييمات بعد"}
            </p>
          </header>

          <section aria-labelledby="book-description" className="space-y-2">
            <h2 id="book-description" className="text-lg font-bold text-slate-900">
              نبذة عن الكتاب
            </h2>
            <p className="text-sm leading-7 text-slate-600 sm:text-base">
              {book.description ?? "لا يتوفر وصف لهذا الكتاب حاليًا."}
            </p>
          </section>

          <WishlistSection bookId={book.id} slug={book.slug} isLoggedIn={isLoggedIn} isWishlisted={isWishlisted} />

          <BookMetadata publicationDate={book.publicationDate} metadata={book.metadata} />

          <BookOffers offers={offers} />

          <section aria-labelledby="book-content-access" className="space-y-3">
            <h2 id="book-content-access" className="text-lg font-bold text-slate-900">
              الوصول إلى المحتوى
            </h2>
            {book.accessGuidance ? (
              <p className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">{book.accessGuidance}</p>
            ) : null}
            {book.publicReadUrl || book.publicDownloadUrl ? (
              <div className="flex flex-wrap gap-3">
                {book.publicReadUrl ? (
                  <Link
                    href={book.publicReadUrl}
                    className="inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                  >
                    {book.publicReadLabel ?? "اقرأ الآن"}
                  </Link>
                ) : null}
                {book.publicDownloadUrl ? (
                  <Link
                    href={book.publicDownloadUrl}
                    target="_blank"
                    className="inline-flex rounded-xl border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                  >
                    تحميل
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p>لا تتوفر قراءة أو تحميل مباشر لهذا الكتاب حاليًا. استخدم خيارات الشراء أو الإيجار للوصول إلى المحتوى داخل المكتبة.</p>
                {book.contentStateNote ? <p className="text-xs font-semibold text-slate-700">{book.contentStateNote}</p> : null}
              </div>
            )}
          </section>

          <OrderSummaryCard bookId={book.id} bookTitle={book.title} offers={offers} />

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {userReview
              ? "يمكنك تحديث تقييمك ومراجعتك لهذا الكتاب في قسم المراجعات أدناه."
              : "أضف تقييمك ومراجعتك لمساعدة القراء الآخرين في اختيار الكتاب المناسب."}
          </div>
        </div>
      </div>
    </section>
  );
}

function WishlistSection({
  bookId,
  slug,
  isLoggedIn,
  isWishlisted,
}: {
  bookId: string;
  slug: string;
  isLoggedIn: boolean;
  isWishlisted: boolean;
}) {
  if (!isLoggedIn) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
        لحفظ هذا الكتاب في المفضلة،
        <Link href={`/login?callbackUrl=${encodeURIComponent(`/books/${slug}`)}`} className="mr-1 font-semibold text-indigo-700 hover:text-indigo-800">
          سجّل الدخول
        </Link>
        أولًا.
      </div>
    );
  }

  return (
    <form action={toggleWishlistAction}>
      <input type="hidden" name="bookId" value={bookId} />
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        className={`rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
          isWishlisted ? "bg-rose-100 text-rose-700 hover:bg-rose-200" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
        }`}
      >
        {isWishlisted ? "♥ إزالة من المفضلة" : "♡ أضف إلى المفضلة"}
      </button>
    </form>
  );
}

function BookMetadata({ publicationDate, metadata }: { publicationDate: Date | null; metadata: unknown }) {
  const metadataObject = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? (metadata as Record<string, unknown>) : null;
  const pagesValue = metadataObject?.pages;
  const languageValue = metadataObject?.language;
  const publisherValue = metadataObject?.publisher;

  const metadataItems = [
    { label: "اللغة", value: "العربية" },
    { label: "اللغة (metadata)", value: typeof languageValue === "string" ? languageValue : null },
    { label: "عدد الصفحات", value: typeof pagesValue === "number" || typeof pagesValue === "string" ? String(pagesValue) : null },
    { label: "الناشر", value: typeof publisherValue === "string" ? publisherValue : null },
    {
      label: "سنة النشر",
      value: publicationDate ? String(publicationDate.getFullYear()) : null,
    },
  ].filter((item) => item.value);

  if (metadataItems.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="book-metadata" className="space-y-3">
      <h2 id="book-metadata" className="text-lg font-bold text-slate-900">
        بيانات الكتاب
      </h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        {metadataItems.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <dt className="text-xs font-semibold text-slate-500">{item.label}</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-800">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function BookOffers({ offers }: { offers: Pick<BookOffer, "id" | "type" | "priceCents" | "currency" | "rentalDays">[] }) {
  return (
    <section aria-labelledby="book-offers" className="space-y-3">
      <h2 id="book-offers" className="text-lg font-bold text-slate-900">
        العروض المتاحة
      </h2>

      {offers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600">
          <p>لا توجد عروض متاحة لهذا الكتاب حاليًا.</p>
          <p className="mt-1 text-xs">لن تظهر أزرار الشراء/الاستئجار قبل إضافة عرض صالح ومفعل من الاستوديو.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {offers.map((offer) => (
            <li key={offer.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">{offerLabelByType[offer.type]}</span>
                {offer.type === "RENTAL" && offer.rentalDays ? (
                  <span className="text-xs text-slate-500">({offer.rentalDays} يوم)</span>
                ) : null}
              </div>
              <span className="font-semibold text-indigo-700">{formatOfferPrice(offer.priceCents, offer.currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function BookReviewsSection({
  bookId,
  slug,
  averageRating,
  reviewsCount,
  isLoggedIn,
  userReview,
  reviews,
}: ReviewsSectionProps) {
  return (
    <section aria-labelledby="book-reviews" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="book-reviews" className="text-2xl font-bold text-slate-900">
          المراجعات والتقييمات
        </h2>
        <p className="text-sm font-semibold text-amber-600">
          {averageRating > 0 ? `★ ${averageRating.toFixed(1)} من 5 (${reviewsCount})` : "ابدأ أول تقييم لهذا الكتاب"}
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              لا توجد مراجعات بعد. كن أول من يكتب مراجعة لهذا الكتاب.
            </div>
          ) : (
            reviews.map((review) => (
              <article key={review.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold text-slate-800">{review.userName}</p>
                  <span className="font-semibold text-amber-600">★ {review.rating}/5</span>
                </div>
                {review.comment ? <p className="mt-2 text-sm leading-7 text-slate-600">{review.comment}</p> : null}
                <p className="mt-2 text-xs text-slate-500">{review.createdAt.toLocaleDateString("ar-SY")}</p>
              </article>
            ))
          )}
        </div>

        {isLoggedIn ? (
          <form action={submitReviewAction} className="space-y-3 rounded-xl border border-slate-200 p-4">
            <input type="hidden" name="bookId" value={bookId} />
            <input type="hidden" name="slug" value={slug} />

            <label className="block space-y-2 text-sm font-medium text-slate-700">
              تقييمك
              <select
                name="rating"
                defaultValue={String(userReview?.rating ?? 5)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="5">5 - ممتاز</option>
                <option value="4">4 - جيد جدًا</option>
                <option value="3">3 - جيد</option>
                <option value="2">2 - مقبول</option>
                <option value="1">1 - ضعيف</option>
              </select>
            </label>

            <label className="block space-y-2 text-sm font-medium text-slate-700">
              تعليقك (اختياري)
              <textarea
                name="comment"
                defaultValue={userReview?.comment ?? ""}
                rows={5}
                maxLength={600}
                placeholder="اكتب رأيك حول جودة المحتوى وأسلوب الكتابة..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </label>

            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              {userReview ? "تحديث المراجعة" : "إرسال المراجعة"}
            </button>
          </form>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            لإضافة تقييمك،
            <Link href={`/login?callbackUrl=${encodeURIComponent(`/books/${slug}`)}`} className="mr-1 font-semibold text-indigo-700 hover:text-indigo-800">
              سجّل الدخول
            </Link>
            ثم اكتب مراجعتك.
          </div>
        )}
      </div>
    </section>
  );
}

export function RelatedBooksSection({ books }: RelatedBooksProps) {
  return (
    <section aria-labelledby="related-books" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <h2 id="related-books" className="text-2xl font-bold text-slate-900">
        كتب ذات صلة
      </h2>

      {books.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">لا توجد كتب ذات صلة متاحة حاليًا.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {books.map((book) => (
            <article key={book.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <CoverImage
                src={book.coverImageUrl}
                alt={`غلاف كتاب ${book.title}`}
                width={480}
                height={720}
                className="h-48 w-full object-cover"
              />
              <div className="space-y-3 p-4">
                <div>
                  <h3 className="line-clamp-2 text-base font-bold text-slate-900">{book.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{book.author}</p>
                </div>
                <Link
                  href={`/books/${book.slug}`}
                  className="inline-flex rounded-lg bg-white px-3 py-2 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  عرض التفاصيل
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatOfferPrice(priceCents: number, currency: string) {
  return formatArabicCurrency(priceCents / 100, { currency });
}
