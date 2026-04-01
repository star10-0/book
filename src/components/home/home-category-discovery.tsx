"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CoverImage } from "@/components/ui/cover-image";

export type DiscoveryBook = {
  id: string;
  slug: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
  averageRating: number;
  reviewsCount: number;
  pricingLabel: string;
};

export type DiscoveryCategory = {
  slug: string;
  name: string;
  description: string;
  books: DiscoveryBook[];
};

export function HomeCategoryDiscovery({ categories }: { categories: DiscoveryCategory[] }) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.slug ?? "");

  const selected = useMemo(
    () => categories.find((category) => category.slug === activeCategory) ?? categories[0],
    [activeCategory, categories],
  );

  if (!selected) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-2xl border border-white/40 bg-white/70 p-4 shadow-[0_22px_45px_-35px_rgba(15,23,42,0.65)] backdrop-blur-sm sm:p-5" aria-label="اكتشاف حسب التصنيف">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold text-slate-500">الاكتشاف السريع</p>
          <h3 className="text-base font-black text-slate-900 sm:text-lg">تصفح حسب التصنيف ثم تابع إلى صفحة الكتب</h3>
        </div>
        <Link href="/books" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          كل الكتب
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {categories.map((category) => {
          const isActive = category.slug === selected.slug;

          return (
            <button
              key={category.slug}
              type="button"
              onClick={() => setActiveCategory(category.slug)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                isActive
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
              }`}
              aria-pressed={isActive}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-200/80 pt-3">
        <div>
          <h4 className="text-lg font-black text-slate-900 sm:text-xl">{selected.name}</h4>
          <p className="mt-1 text-xs leading-6 text-slate-600 sm:text-sm">{selected.description}</p>
        </div>
        <Link href={`/books?category=${selected.slug}`} className="rounded-md border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
          عرض كل كتب {selected.name}
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {selected.books.slice(0, 4).map((book) => (
          <article key={book.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <Link href={`/books/${book.slug}`} className="flex gap-2.5">
              <CoverImage
                src={book.coverImageUrl}
                alt={`غلاف كتاب ${book.title}`}
                width={140}
                height={210}
                className="h-24 w-16 rounded-md object-cover"
              />
              <div className="min-w-0">
                <h4 className="line-clamp-2 text-sm font-bold text-slate-900">{book.title}</h4>
                <p className="mt-1 line-clamp-1 text-xs text-slate-600">{book.author}</p>
                <p className="mt-2 text-[11px] font-semibold text-indigo-700">{book.pricingLabel}</p>
                <p className="mt-1 text-[11px] text-amber-600">
                  {book.averageRating > 0 ? `★ ${book.averageRating.toFixed(1)} (${book.reviewsCount})` : "بدون تقييمات بعد"}
                </p>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
