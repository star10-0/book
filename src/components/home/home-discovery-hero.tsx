import Link from "next/link";
import type { HomeBillboard } from "@/lib/home-billboards";
import type { DiscoveryCategory } from "@/components/home/home-category-discovery";
import { CoverImage } from "@/components/ui/cover-image";

type HomeDiscoveryHeroProps = {
  billboard: HomeBillboard;
  categories: DiscoveryCategory[];
};

export function HomeDiscoveryHero({ billboard, categories }: HomeDiscoveryHeroProps) {
  if (categories.length === 0) {
    return null;
  }

  const merchPanels = categories.slice(0, 4).map((category) => ({
    ...category,
    books: category.books.slice(0, 4),
  }));

  return (
    <section className="space-y-0" aria-labelledby="home-discovery-title">
      <h1 id="home-discovery-title" className="sr-only">
        {billboard.title}
      </h1>
      <div className="relative overflow-hidden border-y border-slate-300 bg-slate-200">
        <div className="h-[230px] border-b border-slate-300 bg-[linear-gradient(180deg,#e5e7eb_0%,#f1f5f9_45%,#ffffff_100%)] sm:h-[280px] lg:h-[330px]">
          <div className="mx-auto flex h-full max-w-[1600px] items-start justify-between px-2 pt-2 sm:px-3 sm:pt-3">
            <button type="button" className="h-9 w-9 border border-slate-300 bg-white/80 text-slate-500" aria-label="السابق">
              ‹
            </button>
            <button type="button" className="h-9 w-9 border border-slate-300 bg-white/80 text-slate-500" aria-label="التالي">
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 -mt-32 grid gap-1 border-b border-slate-200 bg-transparent px-0 pb-0 sm:-mt-36 sm:grid-cols-2 sm:gap-1.5 sm:px-0 sm:pb-0 lg:-mt-40 lg:grid-cols-4">
        {merchPanels.map((category) => (
          <section key={category.slug} className="h-full border border-slate-200 bg-white p-2.5 sm:p-3" aria-label={`عروض ${category.name}`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="line-clamp-1 text-sm font-bold text-slate-900">{category.name}</h2>
              <Link href={`/books?category=${category.slug}`} className="text-xs font-semibold text-slate-500 hover:text-slate-900">
                المزيد
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {category.books.map((book) => (
                <Link key={book.id} href={`/books/${book.slug}`} className="group block">
                  <div className="overflow-hidden border border-slate-200 bg-slate-100">
                    <CoverImage
                      src={book.coverImageUrl}
                      alt={`غلاف ${book.title}`}
                      width={220}
                      height={300}
                      className="h-24 w-full object-contain p-1.5 transition duration-300 group-hover:scale-[1.03] sm:h-28"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
