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
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_-35px_rgba(15,23,42,0.45)] sm:p-4"
      aria-label="اكتشاف حسب التصنيف"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-black text-slate-900 sm:text-lg">عروض من {selected.name}</h3>
        <Link href="/books" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          كل الكتب
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {selected.books.slice(0, 4).map((book, index) => (
          <article key={book.id} className={`group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${index === 0 ? "lg:col-span-2 lg:row-span-2" : ""}`}>
            <Link href={`/books/${book.slug}`} className={`block ${index === 0 ? "lg:grid lg:h-full lg:grid-cols-[1fr_1fr] lg:items-stretch" : ""}`}>
              <CoverImage
                src={book.coverImageUrl}
                alt={`غلاف كتاب ${book.title}`}
                width={320}
                height={460}
                className={`w-full bg-slate-100 object-contain p-2 transition duration-300 group-hover:scale-[1.02] ${index === 0 ? "h-52 lg:h-full" : "h-40"}`}
              />
              <div className={`space-y-1.5 p-3 ${index === 0 ? "lg:flex lg:flex-col lg:justify-between" : ""}`}>
                <div className="space-y-1.5">
                  <h4 className={`line-clamp-2 font-extrabold text-slate-900 ${index === 0 ? "min-h-12 text-base sm:text-lg" : "min-h-10 text-sm sm:text-base"}`}>{book.title}</h4>
                  <p className="line-clamp-1 text-xs text-slate-600 sm:text-sm">{book.author}</p>
                </div>
                <p className="inline-flex w-fit rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">ضمن {selected.name}</p>
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
