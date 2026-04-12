"use client";

import Link from "next/link";
import { useRef } from "react";
import { CoverImage } from "@/components/ui/cover-image";

type CoverBook = {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
};

type MerchandisingBlock = {
  id: string;
  label: string;
  href?: string;
  books: CoverBook[];
};

export function HomeRecommendationRail({ books }: { books: CoverBook[] }) {
  const railRef = useRef<HTMLDivElement | null>(null);

  if (books.length === 0) {
    return null;
  }

  const scrollRail = () => {
    if (!railRef.current) {
      return;
    }

    railRef.current.scrollBy({
      left: Math.max(railRef.current.clientWidth * 0.8, 240),
      behavior: "smooth",
    });
  };

  return (
    <section className="px-1 pt-4 sm:px-0" aria-labelledby="home-recommended-rail-title">
      <div className="mb-1.5 flex items-center justify-between">
        <h2 id="home-recommended-rail-title" className="text-[11px] font-medium text-slate-500">
          مقترح لك
        </h2>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={scrollRail}
          aria-label="تمرير المقترحات"
          className="absolute left-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-base text-slate-700 shadow-sm transition hover:bg-white"
        >
          ‹
        </button>

        <div
          ref={railRef}
          className="hide-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-11 pb-1 pt-1 sm:gap-2.5 sm:px-12"
        >
          {books.map((book) => (
            <Link
              key={book.id}
              href={`/books/${book.slug}`}
              className="group block w-[92px] shrink-0 snap-start sm:w-[102px] lg:w-[120px] xl:w-[126px]"
              aria-label={`اذهب إلى صفحة ${book.title}`}
            >
              <CoverImage
                src={book.coverImageUrl}
                alt={`غلاف ${book.title}`}
                width={320}
                height={480}
                className="aspect-[3/4] w-full bg-slate-100 object-cover transition duration-300 group-hover:opacity-95"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeMerchandisingRows({ blocks }: { blocks: MerchandisingBlock[] }) {
  if (blocks.length === 0) {
    return null;
  }

  const rows: MerchandisingBlock[][] = [];
  for (let index = 0; index < blocks.length; index += 4) {
    rows.push(blocks.slice(index, index + 4));
  }

  return (
    <section className="space-y-4 px-1 pb-2 sm:px-0" aria-labelledby="home-merchandising-title">
      <h2 id="home-merchandising-title" className="sr-only">
        صفوف اكتشاف الكتب
      </h2>

      {rows.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`} className="space-y-1.5">
          <p className="text-[11px] font-medium text-slate-500">{rowIndex === 0 ? "تصنيفات" : "اكتشف المزيد"}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
            {row.map((block) => (
              <article key={block.id} className="p-1.5 sm:p-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  {block.href ? <Link href={block.href} className="line-clamp-1 text-[11px] font-medium text-slate-500 hover:text-slate-700">{block.label}</Link> : <p className="line-clamp-1 text-[11px] font-medium text-slate-500">{block.label}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {block.books.slice(0, 4).map((book) => (
                    <Link key={book.id} href={`/books/${book.slug}`} className="group block" aria-label={`اذهب إلى صفحة ${book.title}`}>
                      <CoverImage
                        src={book.coverImageUrl}
                        alt={`غلاف ${book.title}`}
                        width={260}
                        height={380}
                        className="aspect-[3/4] w-full bg-slate-100 object-cover transition duration-300 group-hover:opacity-95"
                      />
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
