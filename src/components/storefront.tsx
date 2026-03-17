import Image from "next/image";
import Link from "next/link";
import type { OfferType } from "@prisma/client";

type CategoryPreviewItem = {
  name: string;
  description: string;
};

type FeaturedBookItem = {
  id: string;
  title: string;
  author: string;
  category: string;
  coverImageUrl: string | null;
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
  title: string;
  author: string;
  category: string;
  coverImageUrl: string | null;
  offers: BookCardOffer[];
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
    <section className="rounded-3xl bg-gradient-to-l from-indigo-700 to-indigo-500 p-8 text-white shadow-lg sm:p-12">
      <p className="text-sm font-semibold text-indigo-100">منصة عربية أولًا</p>
      <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">اكتشف كتبك الرقمية المفضلة</h1>
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
    <section className="mt-10 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900">كتب مميزة</h2>
        <Link href="/books" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          عرض الكل
        </Link>
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => (
          <article key={book.id} className="overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200">
            <Image src={book.coverImageUrl ?? defaultCover} alt={`غلاف كتاب ${book.title}`} width={600} height={900} className="h-56 w-full object-cover" />
            <div className="space-y-2 p-4">
              <h3 className="text-lg font-bold text-slate-900">{book.title}</h3>
              <p className="text-sm text-slate-600">{book.author}</p>
              <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                {book.category}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CategoriesPreviewSection({ categories }: { categories: CategoryPreviewItem[] }) {
  return (
    <section className="mt-10 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <h2 className="text-2xl font-bold text-slate-900">تصنيفات شائعة</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <article key={category.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-bold text-slate-900">{category.name}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{category.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

type BooksFiltersProps = {
  categories: BooksFilterCategory[];
  search: string;
  category: string;
  offerType: "all" | "buy" | "rent";
  sort: "newest" | "title" | "price_asc";
};

export function BooksFilters({ categories, search, category, offerType, sort }: BooksFiltersProps) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <form className="space-y-4" method="get">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            بحث عن كتاب
            <input
              name="q"
              type="search"
              defaultValue={search}
              placeholder="ابحث بعنوان الكتاب..."
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
  return `${(priceCents / 100).toLocaleString("ar-SY")} ${currency}`;
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
        <p className="mt-2 text-sm text-slate-600">
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

            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {book.category}
            </span>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">العروض المتاحة</p>
              <ul className="space-y-2">
                {book.offers.map((offer) => (
                  <li
                    key={offer.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{offerLabels[offer.type]}</span>
                      {offer.type === "RENTAL" && offer.rentalDays ? (
                        <span className="text-xs text-slate-500">({offer.rentalDays} يوم)</span>
                      ) : null}
                    </div>
                    <span className="font-semibold text-indigo-700">
                      {formatPrice(offer.priceCents, offer.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
