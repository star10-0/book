"use client";

import Link from "next/link";
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
  const selected = categories[0];

  if (!selected) {
    return null;
  }

  return (
    <section
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_-35px_rgba(15,23,42,0.45)] sm:p-4"
      aria-label="اكتشاف حسب التصنيف"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-black text-slate-900 sm:text-lg">أبرز الكتب الآن</h3>
        </div>
        <Link href="/books" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          كل الكتب
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-200/80 pt-2">
        <div>
          <h4 className="text-lg font-black text-slate-900 sm:text-xl">{selected.name}</h4>
          <p className="mt-1 text-xs leading-6 text-slate-600 sm:text-sm">{selected.description}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {selected.books.slice(0, 4).map((book) => (
          <article key={book.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Link href={`/books/${book.slug}`} className="block">
              <CoverImage
                src={book.coverImageUrl}
                alt={`غلاف كتاب ${book.title}`}
                width={320}
                height={460}
                className="h-44 w-full bg-slate-100 object-contain p-2 transition duration-300 group-hover:scale-[1.02]"
              />
              <div className="space-y-1.5 p-3">
                <h4 className="line-clamp-2 min-h-10 text-sm font-extrabold text-slate-900 sm:text-base">{book.title}</h4>
                <p className="line-clamp-1 text-xs text-slate-600 sm:text-sm">{book.author}</p>
                <p className="text-xs font-bold text-rose-700 sm:text-sm">{book.pricingLabel}</p>
                <p className="text-[11px] text-amber-600">
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
