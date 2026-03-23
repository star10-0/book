import Image from "next/image";
import Link from "next/link";
import type { OfferType } from "@prisma/client";
import { formatArabicCurrency } from "@/lib/formatters/intl";

type CategoryPreviewItem = {
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
};

type RecommendedBookItem = {
  id: string;
  slug: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
  reason: string;
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
  coverImageUrl: string | null;
  offers: BookCardOffer[];
  averageRating: number;
  reviewsCount: number;
  isWishlisted?: boolean;
};

type BooksFilterCategory = {
  slug: string;
  nameAr: string;
};

const offerLabels: Record<OfferType, string> = {
  PURCHASE: "شراء",
  RENTAL: "استئجار",
};

const defaultCover = "https://placehold.co/600x900/e2e8f0/334155?text=Book";

export function HeroSection() {
  return (
    <section className="rounded-3xl bg-gradient-to-l from-indigo-700 to-indigo-500 p-6 text-white shadow-lg sm:p-10 lg:p-12">
      <p className="text-sm font-semibold text-indigo-100">منصة عربية أولًا</p>
      <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">اكتشف كتبك الرقمية المفضلة</h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-indigo-100 sm:text-lg">
        اشترِ أو استأجر الكتب العربية بسهولة، واقرأ أينما كنت عبر تجربة حديثة تدعم الهاتف واللوحي
        وسطح المكتب.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/books"
          className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          تصفّح الكتب
        </Link>
        <Link
          href="/admin"
          className="rounded-xl border border-indigo-200/70 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          انضم كبائع
        </Link>
      </div>
    </section>
  );
}

export function FeaturedBooksSection({ books }: { books: FeaturedBookItem[] }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900">كتب مميزة</h2>
        <Link href="/books" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          عرض الكل
        </Link>
      </div>

      {books.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          لا توجد كتب مميزة الآن. سنضيف توصيات جديدة قريبًا.
        </p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <article key={book.id} className="overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200">
              <Image src={book.coverImageUrl ?? defaultCover} alt={`غلاف كتاب ${book.title}`} width={600} height={900} className="h-56 w-full object-cover" />
              <div className="space-y-2 p-4">
                <h3 className="line-clamp-2 text-lg font-bold text-slate-900">{book.title}</h3>
                <p className="text-sm text-slate-600">{book.author}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">
                    {book.category}
                  </span>
                  <span className="font-semibold text-amber-600">
                    {book.averageRating > 0 ? `★ ${book.averageRating.toFixed(1)} (${book.reviewsCount})` : "بدون تقييمات"}
                  </span>
                </div>
                <Link
                  href={`/books/${book.slug}`}
                  className="inline-flex rounded-lg bg-white px-3 py-2 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50"
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

export function RecommendedBooksSection({ books }: { books: RecommendedBookItem[] }) {
  if (books.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <h2 className="text-2xl font-bold text-slate-900">مقترح لك</h2>
      <p className="mt-2 text-sm text-slate-600">كتب مختارة حسب تقييمات القرّاء وتنوّع التصنيفات.</p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {books.map((book) => (
          <article key={book.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex gap-3">
              <Image src={book.coverImageUrl ?? defaultCover} alt={`غلاف ${book.title}`} width={120} height={170} className="h-24 w-16 rounded-lg object-cover" />
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-sm font-bold text-slate-900">{book.title}</h3>
                <p className="mt-1 text-xs text-slate-600">{book.author}</p>
                <p className="mt-2 text-xs text-indigo-700">{book.reason}</p>
              </div>
            </div>
            <Link href={`/books/${book.slug}`} className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              اقرأ المزيد ←
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CategoriesPreviewSection({ categories }: { categories: CategoryPreviewItem[] }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <h2 className="text-2xl font-bold text-slate-900">تصنيفات شائعة</h2>

      {categories.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          لم تتم إضافة تصنيفات بعد. يمكنك العودة لاحقًا لاستكشاف الأقسام الجديدة.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <article key={category.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-bold text-slate-900">{category.name}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{category.description}</p>
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
};

export function BooksFilters({ categories, search, category, offerType, sort }: BooksFiltersProps) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <form className="space-y-4" method="get">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            بحث بالعنوان أو اسم الكاتب
            <input
              name="q"
              type="search"
              defaultValue={search}
              placeholder="مثال: مدينة الظلال أو ليث حداد"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>

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

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            تطبيق
          </button>
          <Link
            href="/books"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
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
      </section>
    );
  }

  return (
    <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {books.map((book) => (
        <article key={book.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <Image src={book.coverImageUrl ?? defaultCover} alt={`غلاف كتاب ${book.title}`} width={600} height={900} className="h-64 w-full object-cover" />
          <div className="space-y-3 p-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{book.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{book.author}</p>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                {book.category}
              </span>
              <span className="font-semibold text-amber-600">
                {book.averageRating > 0 ? `★ ${book.averageRating.toFixed(1)} (${book.reviewsCount})` : "بدون تقييم"}
              </span>
            </div>

            <ul className="space-y-1 text-sm text-slate-700">
              {book.offers.map((offer) => (
                <li key={offer.id} className="flex items-center justify-between">
                  <span>
                    {offerLabels[offer.type]}
                    {offer.type === "RENTAL" && offer.rentalDays ? ` (${offer.rentalDays} يوم)` : ""}
                  </span>
                  <span className="font-semibold text-indigo-700">{formatPrice(offer.priceCents, offer.currency)}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between">
              <Link
                href={`/books/${book.slug}`}
                className="inline-flex rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                عرض التفاصيل
              </Link>
              {book.isWishlisted ? (
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">♥ في المفضلة</span>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
