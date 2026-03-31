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

const defaultCover = "https://placehold.co/600x900/png/e2e8f0/334155?text=Book";

export function HeroSection() {
  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-indigo-200/50 bg-gradient-to-l from-slate-900 via-indigo-900 to-indigo-700 p-5 text-white shadow-[0_20px_60px_-32px_rgba(30,41,59,0.8)] sm:p-8 lg:p-10"
      aria-labelledby="hero-title"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),_transparent_42%)]" aria-hidden />
      <div className="pointer-events-none absolute -start-16 bottom-0 h-52 w-52 rounded-full bg-indigo-400/25 blur-3xl" aria-hidden />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-indigo-100">Amjad Storefront</p>
          <h1 id="hero-title" className="mt-2 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
            واجهتك الأسرع لاكتشاف وشراء الكتب العربية الرقمية
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-indigo-100/95 sm:text-base">
            عروض يومية، كتب مميزة، وتجربة شراء أو استئجار واضحة — كل ما تحتاجه لبناء مكتبتك الرقمية في دقائق.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Link
              href="/books"
              className="inline-flex h-9 items-center rounded-md bg-amber-300 px-4 text-xs font-bold text-slate-900 transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              ابدأ التسوق
            </Link>
            <Link
              href="/books?offer=rent"
              className="inline-flex h-9 items-center rounded-md border border-indigo-200/60 bg-white/10 px-4 text-xs font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              عروض الاستئجار
            </Link>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {[
            { label: "كتب رقمية", value: "+120" },
            { label: "عروض شراء", value: "يوميًا" },
            { label: "استئجار مرن", value: "7-30 يوم" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
              <p className="text-[11px] text-indigo-100">{stat.label}</p>
              <p className="mt-1 text-base font-extrabold">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeaturedBooksSection({ books }: { books: FeaturedBookItem[] }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6" aria-labelledby="featured-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-slate-500">واجهة العرض</p>
          <h2 id="featured-title" className="text-xl font-bold text-slate-900 sm:text-2xl">كتب مميزة اليوم</h2>
        </div>
        <Link href="/books" className="inline-flex h-8 items-center rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
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
            <article key={book.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
              <Image src={book.coverImageUrl ?? defaultCover} alt={`غلاف كتاب ${book.title}`} width={600} height={900} className="h-52 w-full object-cover" />
              <div className="space-y-2.5 p-4">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">الأكثر إبرازًا</span>
                  <span className="font-bold text-slate-500">#{index + 1}</span>
                </div>
                <h3 className="line-clamp-2 text-base font-bold text-slate-900">{book.title}</h3>
                <p className="text-xs text-slate-600">{book.author}</p>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700">{book.category}</span>
                  <span className="font-semibold text-amber-600">
                    {book.averageRating > 0 ? `★ ${book.averageRating.toFixed(1)} (${book.reviewsCount})` : "بدون تقييمات"}
                  </span>
                </div>
                <Link
                  href={`/books/${book.slug}`}
                  className="inline-flex h-8 items-center rounded-md bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
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
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6" aria-labelledby="recommended-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-slate-500">ترشيحات التسوق</p>
          <h2 id="recommended-title" className="text-xl font-bold text-slate-900 sm:text-2xl">مقترح لك</h2>
        </div>
        <Link href="/books" className="inline-flex h-8 items-center rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          تسوق الآن
        </Link>
      </div>
      <p className="mt-2 text-xs text-slate-600 sm:text-sm">كتب مختارة حسب تقييمات القرّاء وتنوّع التصنيفات.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => (
          <article key={book.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex gap-3">
              <Image src={book.coverImageUrl ?? defaultCover} alt={`غلاف ${book.title}`} width={120} height={170} className="h-24 w-16 rounded-md object-cover" />
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-sm font-bold text-slate-900">{book.title}</h3>
                <p className="mt-1 text-xs text-slate-600">{book.author}</p>
                <p className="mt-2 text-[11px] text-indigo-700">{book.reason}</p>
              </div>
            </div>
            <Link href={`/books/${book.slug}`} className="mt-3 inline-flex h-7 items-center rounded-md bg-white px-2.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50">
              اقرأ المزيد
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CategoriesPreviewSection({ categories }: { categories: CategoryPreviewItem[] }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6" aria-labelledby="categories-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-slate-500">الأقسام</p>
          <h2 id="categories-title" className="text-xl font-bold text-slate-900 sm:text-2xl">تسوّق حسب التصنيف</h2>
        </div>
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
              <Link href="/books" className="mt-3 inline-flex h-7 items-center rounded-md border border-slate-300 px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-white">
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

            <div className="space-y-2">
              {book.offers.map((offer) => (
                <div key={offer.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                  <div>
                    <p className="font-semibold text-slate-700">{offerLabels[offer.type]}</p>
                    {offer.rentalDays ? <p className="text-slate-500">لمدة {offer.rentalDays} يوم</p> : null}
                  </div>
                  <p className="text-sm font-bold text-slate-900">{formatPrice(offer.priceCents, offer.currency)}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/books/${book.slug}`}
                className="inline-flex h-9 items-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                عرض التفاصيل
              </Link>
              {book.isWishlisted ? (
                <span className="inline-flex h-9 items-center rounded-xl border border-amber-300 bg-amber-50 px-4 text-xs font-semibold text-amber-700">
                  ضمن المفضلة
                </span>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
