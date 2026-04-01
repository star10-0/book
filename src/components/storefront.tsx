import Link from "next/link";
import type { OfferType } from "@prisma/client";
import { formatArabicCurrency } from "@/lib/formatters/intl";
import { CoverImage } from "@/components/ui/cover-image";

type CategoryPreviewItem = {
  slug: string;
  name: string;
  description: string;
};

type FeaturedBookItem = {
  id: string;
  slug: string;
  title: string;
  author: string;
  category: string;
  coverImageUrl: string | null;
  averageRating: number;
  reviewsCount: number;
  offers: BookCardOffer[];
  publisher?: string | null;
  isLoggedIn?: boolean;
};

type RecommendedBookItem = {
  id: string;
  slug: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
  reason: string;
  offers: BookCardOffer[];
  category?: string;
  publisher?: string | null;
  isLoggedIn?: boolean;
};

type BookCardOffer = {
  id: string;
  type: OfferType;
  priceCents: number;
  currency: string;
  rentalDays: number | null;
};

type BookCardItem = {
  id: string;
  slug: string;
  title: string;
  author: string;
  category: string;
  publisher?: string | null;
  coverImageUrl: string | null;
  offers: BookCardOffer[];
  averageRating: number;
  reviewsCount: number;
  isWishlisted?: boolean;
  isLoggedIn?: boolean;
};

type PrimaryOffer = {
  id: string;
  label: string;
  price: string;
  priceCents: number;
};

type SearchHighlightBookItem = BookCardItem & {
  description?: string | null;
  publisher?: string | null;
};

type BooksFilterCategory = {
  slug: string;
  nameAr: string;
};

export function FeaturedBooksSection({ books }: { books: FeaturedBookItem[] }) {
  return (
    <section className="store-surface" aria-labelledby="featured-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-slate-500">واجهة العرض</p>
          <h2 id="featured-title" className="text-xl font-bold text-slate-900 sm:text-2xl">كتب مميزة اليوم</h2>
        </div>
        <Link href="/books" className="store-btn-secondary h-9 px-4">
          عرض الكل
        </Link>
      </div>

      {books.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
          لا توجد كتب مميزة الآن. سنضيف توصيات جديدة قريبًا.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book, index) => (
            <article key={book.id} className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <CoverImage src={book.coverImageUrl} alt={`غلاف كتاب ${book.title}`} width={600} height={900} className="h-52 w-full object-cover" />
              <div className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">الأكثر إبرازًا</span>
                  <span className="font-bold text-slate-500">#{index + 1}</span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="line-clamp-2 min-h-12 text-base font-bold text-slate-900">{book.title}</h3>
                  <p className="line-clamp-1 text-xs text-slate-600">{book.author}</p>
                  {book.publisher ? <p className="line-clamp-1 text-[11px] text-slate-500">الناشر: {book.publisher}</p> : null}
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700">{book.category}</span>
                  <span className="font-semibold text-amber-600">
                    {book.averageRating > 0 ? `★ ${book.averageRating.toFixed(1)} (${book.reviewsCount})` : "بدون تقييمات"}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-slate-500">ملخص العرض</p>
                  <div className="mt-1.5">
                    <OfferPricingSummary offers={book.offers} />
                  </div>
                </div>
                <div className="mt-auto space-y-2 pt-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <AddToCartAction bookId={book.id} bookSlug={book.slug} offers={book.offers} isLoggedIn={book.isLoggedIn} />
                    <Link href={`/books/${book.slug}`} className="store-btn-secondary h-10 w-full px-3 text-xs sm:w-auto">
                      عرض التفاصيل
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function RecommendedBooksSection({ books }: { books: RecommendedBookItem[] }) {
  if (books.length === 0) {
    return null;
  }

  return (
    <section className="store-surface" aria-labelledby="recommended-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-slate-500">ترشيحات التسوق</p>
          <h2 id="recommended-title" className="text-xl font-bold text-slate-900 sm:text-2xl">مقترح لك</h2>
        </div>
        <Link href="/books" className="store-btn-secondary h-9 px-4">
          تسوق الآن
        </Link>
      </div>
      <p className="mt-2 text-xs text-slate-600 sm:text-sm">كتب مختارة حسب تقييمات القرّاء وتنوّع التصنيفات.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => (
          <article key={book.id} className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex gap-3">
              <CoverImage src={book.coverImageUrl} alt={`غلاف ${book.title}`} width={120} height={170} className="h-24 w-16 rounded-md object-cover" />
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 min-h-10 text-sm font-bold text-slate-900">{book.title}</h3>
                <p className="mt-1 text-xs text-slate-600">{book.author}</p>
                {book.publisher ? <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{book.publisher}</p> : null}
                {book.category ? <p className="mt-1 text-[11px] font-semibold text-indigo-700">{book.category}</p> : null}
                <p className="mt-2 text-[11px] text-indigo-700">{book.reason}</p>
              </div>
            </div>
            <div className="mt-auto space-y-2.5 pt-3">
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <p className="text-[11px] font-semibold text-slate-500">ملخص العرض</p>
                <div className="mt-1.5">
                  <OfferPricingSummary offers={book.offers} />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <AddToCartAction bookId={book.id} bookSlug={book.slug} offers={book.offers} isLoggedIn={book.isLoggedIn} />
                <Link href={`/books/${book.slug}`} className="store-btn-secondary h-10 w-full px-3 text-xs text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50 sm:w-auto">
                  اقرأ المزيد
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CategoriesPreviewSection({ categories }: { categories: CategoryPreviewItem[] }) {
  return (
    <section className="store-surface" aria-labelledby="categories-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-slate-500">بوابات التصفح</p>
          <h2 id="categories-title" className="text-xl font-bold text-slate-900 sm:text-2xl">ابدأ من التصنيف المناسب لك</h2>
        </div>
        <Link href="/books" className="store-btn-secondary h-9 px-4">
          كل التصنيفات
        </Link>
      </div>

      {categories.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
          لم تتم إضافة تصنيفات بعد. يمكنك العودة لاحقًا لاستكشاف الأقسام الجديدة.
        </p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <article key={category.name} className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
              <h3 className="text-sm font-bold text-slate-900">{category.name}</h3>
              <p className="mt-1.5 text-xs leading-6 text-slate-600">{category.description}</p>
              <Link href={`/books?category=${category.slug}`} className="store-btn-secondary mt-3 h-8 px-3 text-[11px]">
                عرض الكتب
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

type BooksFiltersProps = {
  categories: BooksFilterCategory[];
  search: string;
  category: string;
  offerType: "all" | "buy" | "rent";
  sort: "newest" | "title" | "price_asc" | "price_desc" | "rating";
  resultsCount?: number;
};

export function BooksFilters({ categories, search, category, offerType, sort, resultsCount = 0 }: BooksFiltersProps) {
  const selectedCategoryLabel = categories.find((item) => item.slug === category)?.nameAr;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-4">
        <div>
          <p className="text-[11px] font-semibold text-slate-500">البحث والاكتشاف</p>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">ابحث عن كتابك القادم</h2>
        </div>
        <p className="store-chip bg-indigo-50 font-bold text-indigo-700">{resultsCount} نتيجة متاحة</p>
      </div>

      <form className="space-y-4" method="get">
        <label className="block space-y-2 text-sm font-medium text-slate-700">
          بحث بالعنوان أو اسم الكاتب
          <input
            name="q"
            type="search"
            defaultValue={search}
            placeholder="مثال: مدينة الظلال أو ليث حداد"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-3">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            التصنيف
            <select
              name="category"
              defaultValue={category}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">كل التصنيفات</option>
              {categories.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.nameAr}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            نوع العرض
            <select
              name="offer"
              defaultValue={offerType}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">كل العروض</option>
              <option value="buy">شراء</option>
              <option value="rent">استئجار</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            ترتيب النتائج
            <select
              name="sort"
              defaultValue={sort}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="newest">الأحدث</option>
              <option value="title">العنوان</option>
              <option value="price_asc">السعر: من الأقل إلى الأعلى</option>
              <option value="price_desc">السعر: من الأعلى إلى الأقل</option>
              <option value="rating">الأعلى تقييمًا</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {search ? (
            <span className="store-chip h-7 bg-slate-100 px-2.5 text-[11px] text-slate-700">
              البحث: {search}
            </span>
          ) : null}
          {selectedCategoryLabel ? (
            <span className="store-chip h-7 bg-slate-100 px-2.5 text-[11px] text-slate-700">
              التصنيف: {selectedCategoryLabel}
            </span>
          ) : null}
          {offerType !== "all" ? (
            <span className="store-chip h-7 bg-slate-100 px-2.5 text-[11px] text-slate-700">
              العرض: {offerType === "buy" ? "شراء" : "استئجار"}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="submit"
            className="store-btn-primary"
          >
            تطبيق
          </button>
          <Link
            href="/books"
            className="store-btn-secondary"
          >
            إعادة التعيين
          </Link>
        </div>
      </form>
    </section>
  );
}

function formatPrice(priceCents: number, currency: string) {
  return formatArabicCurrency(priceCents / 100, { currency });
}

function getPrimaryOffer(offers: BookCardOffer[]): PrimaryOffer | null {
  if (offers.length === 0) {
    return null;
  }

  const purchaseOffer = offers.find((offer) => offer.type === "PURCHASE");
  const candidate = purchaseOffer ?? offers[0];

  return {
    id: candidate.id,
    label:
      candidate.type === "PURCHASE"
        ? "شراء رقمي"
        : candidate.rentalDays
          ? `استئجار (${candidate.rentalDays} يوم)`
          : "استئجار رقمي",
    price: formatPrice(candidate.priceCents, candidate.currency),
    priceCents: candidate.priceCents,
  };
}

function buildAddToCartHref(bookSlug: string, bookId: string, offerId: string) {
  const params = new URLSearchParams({
    bookId,
    offerId,
    returnTo: `/books/${bookSlug}`,
  });

  return `/cart?${params.toString()}`;
}

function AddToCartAction({
  bookId,
  bookSlug,
  offers,
  isLoggedIn = false,
}: {
  bookId: string;
  bookSlug: string;
  offers: BookCardOffer[];
  isLoggedIn?: boolean;
}) {
  const primaryOffer = getPrimaryOffer(offers);

  if (!primaryOffer) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-slate-200 px-3 text-xs font-semibold text-slate-500 sm:w-auto"
      >
        غير متاح للشراء حاليًا
      </button>
    );
  }

  const addToCartHref = buildAddToCartHref(bookSlug, bookId, primaryOffer.id);

  if (!isLoggedIn) {
    return (
      <Link
        href={`/login?callbackUrl=${encodeURIComponent(addToCartHref)}`}
        className="store-btn-primary h-10 w-full px-3 text-[11px] sm:w-auto sm:min-w-[10rem] sm:text-xs"
      >
        سجّل الدخول للإضافة إلى السلة
      </Link>
    );
  }

  return (
    <Link href={addToCartHref} className="store-btn-primary h-10 w-full px-3 text-xs sm:w-auto sm:min-w-[8.5rem]">
      أضف إلى السلة
    </Link>
  );
}

function ActiveOffersSummary({ offers }: { offers: BookCardOffer[] }) {
  const hasPurchase = offers.some((offer) => offer.type === "PURCHASE");
  const hasRental = offers.some((offer) => offer.type === "RENTAL");

  if (hasPurchase && hasRental) {
    return "شراء + استئجار";
  }

  if (hasPurchase) {
    return "شراء";
  }

  return "استئجار";
}

function getActiveOffersSummary(offers: BookCardOffer[]) {
  return ActiveOffersSummary({ offers });
}

function OfferPricingSummary({ offers }: { offers: BookCardOffer[] }) {
  const purchaseOffer = offers.find((offer) => offer.type === "PURCHASE");
  const rentalOffer = offers.find((offer) => offer.type === "RENTAL");
  const startingPrice =
    offers.length > 0 ? formatPrice(Math.min(...offers.map((offer) => offer.priceCents)), offers[0].currency) : null;

  return (
    <div className="space-y-2">
      {startingPrice ? (
        <p className="text-xs font-bold text-slate-900">
          يبدأ من <span className="text-indigo-700">{startingPrice}</span>
        </p>
      ) : null}
      <ul className="space-y-1.5 text-[11px] text-slate-600">
        {purchaseOffer ? (
          <li className="flex items-center justify-between gap-2">
            <span className="font-medium text-slate-700">شراء رقمي</span>
            <span className="font-bold text-slate-900">{formatPrice(purchaseOffer.priceCents, purchaseOffer.currency)}</span>
          </li>
        ) : null}
        {rentalOffer ? (
          <li className="flex items-center justify-between gap-2">
            <span className="font-medium text-slate-700">
              استئجار رقمي
              {rentalOffer.rentalDays ? ` (${rentalOffer.rentalDays} يوم)` : ""}
            </span>
            <span className="font-bold text-indigo-700">{formatPrice(rentalOffer.priceCents, rentalOffer.currency)}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function RatingLabel({ averageRating, reviewsCount }: { averageRating: number; reviewsCount: number }) {
  if (averageRating <= 0) {
    return <span className="font-semibold text-slate-500">بدون تقييم</span>;
  }

  return <span className="font-semibold text-amber-600">{`★ ${averageRating.toFixed(1)} (${reviewsCount})`}</span>;
}

export function SearchHighlightResult({
  book,
  relatedCount,
}: {
  book: SearchHighlightBookItem;
  relatedCount: number;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-l from-white via-indigo-50/70 to-violet-50/70 shadow-sm">
      <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[220px]">
          <CoverImage src={book.coverImageUrl} alt={`غلاف كتاب ${book.title}`} width={500} height={750} className="h-full max-h-[320px] w-full rounded-2xl object-cover ring-1 ring-indigo-100" />
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full bg-indigo-600 px-2.5 py-1 font-bold text-white">أفضل نتيجة</span>
            <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">{book.category}</span>
            <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">{getActiveOffersSummary(book.offers)}</span>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">{book.title}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {book.author}
              {book.publisher ? ` · ${book.publisher}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">
              {book.averageRating > 0 ? `★ ${book.averageRating.toFixed(1)} (${book.reviewsCount} مراجعة)` : "بدون تقييم بعد"}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
              {relatedCount > 0 ? `${relatedCount} كتب مشابهة متاحة` : "استكشف تفاصيل الكتاب"}
            </span>
          </div>

          {book.description ? <p className="line-clamp-3 text-sm leading-7 text-slate-700">{book.description}</p> : null}

          <div className="max-w-md rounded-xl border border-indigo-100 bg-white/95 p-3">
            <p className="text-[11px] font-semibold text-slate-500">الخيارات والأسعار</p>
            <div className="mt-2">
              <OfferPricingSummary offers={book.offers} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <AddToCartAction bookId={book.id} bookSlug={book.slug} offers={book.offers} isLoggedIn={book.isLoggedIn} />
            <Link href={`/books/${book.slug}`} className="store-btn-secondary">
              عرض التفاصيل
            </Link>
            {!book.isLoggedIn && !book.isWishlisted ? (
              <Link href={`/login?callbackUrl=${encodeURIComponent(`/books/${book.slug}`)}`} className="store-btn-secondary">
                سجّل الدخول لإضافة الكتاب إلى المفضلة
              </Link>
            ) : null}
            {book.isWishlisted ? (
              <span className="inline-flex h-9 items-center rounded-md border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-700">
                ضمن المفضلة
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function BooksGrid({
  books,
  hasActiveFilters = false,
}: {
  books: BookCardItem[];
  hasActiveFilters?: boolean;
}) {
  if (books.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <h2 className="text-xl font-bold text-slate-900">
          {hasActiveFilters ? "لا توجد نتائج مطابقة" : "لا توجد كتب متاحة حاليًا"}
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          {hasActiveFilters
            ? "جرّب تعديل كلمات البحث أو الفلاتر للحصول على نتائج أكثر."
            : "سيتم إضافة كتب جديدة قريبًا. تفقد الصفحة لاحقًا."}
        </p>
        {hasActiveFilters ? (
          <Link href="/books" className="store-btn-secondary mx-auto mt-4 w-fit">
            مسح الفلاتر والعودة لكل الكتب
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{hasActiveFilters ? "نتائج أخرى قد تهمك" : "كل الكتب المتاحة"}</h2>
        <p className="text-xs font-semibold text-slate-500">{books.length} كتاب</p>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {books.map((book) => (
          <article key={book.id} className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md focus-within:ring-indigo-300">
            <CoverImage src={book.coverImageUrl} alt={`غلاف كتاب ${book.title}`} width={600} height={900} className="h-52 w-full object-cover" />
            <div className="flex h-full flex-col gap-3 p-4">
              <div className="space-y-1">
                <h3 className="line-clamp-2 min-h-12 text-base font-bold text-slate-900">{book.title}</h3>
                <p className="line-clamp-1 text-xs text-slate-600">{book.author}</p>
                {book.publisher ? <p className="line-clamp-1 text-[11px] text-slate-500">الناشر: {book.publisher}</p> : null}
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">{book.category}</span>
                <RatingLabel averageRating={book.averageRating} reviewsCount={book.reviewsCount} />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700">
                    {getActiveOffersSummary(book.offers)}
                  </span>
                  <span className="font-semibold text-slate-500">خيارات السعر</span>
                </div>
                <div className="mt-2">
                  <OfferPricingSummary offers={book.offers} />
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
                <AddToCartAction bookId={book.id} bookSlug={book.slug} offers={book.offers} isLoggedIn={book.isLoggedIn} />
                <Link href={`/books/${book.slug}`} className="store-btn-secondary h-10 w-full px-3 text-xs sm:w-auto">
                  عرض التفاصيل
                </Link>
                {book.isWishlisted ? (
                  <span className="inline-flex h-10 w-full items-center justify-center rounded-md border border-amber-300 bg-amber-50 px-3 text-[11px] font-semibold text-amber-700 sm:w-auto">
                    ضمن المفضلة
                  </span>
                ) : !book.isLoggedIn ? (
                  <Link
                    href={`/login?callbackUrl=${encodeURIComponent(`/books/${book.slug}`)}`}
                    className="store-btn-secondary h-10 w-full px-3 text-[11px] sm:w-auto"
                  >
                    سجّل الدخول لإضافة الكتاب إلى المفضلة
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
