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
      <div className="relative overflow-hidden rounded-none border-y border-slate-300/80 bg-gradient-to-l from-emerald-100 via-lime-50 to-orange-100 sm:rounded-2xl sm:border sm:shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(255,255,255,0.78),transparent_30%),radial-gradient(circle_at_88%_16%,rgba(249,115,22,0.22),transparent_28%),radial-gradient(circle_at_55%_100%,rgba(2,6,23,0.14),transparent_42%)]" aria-hidden />

        <div className="relative grid min-h-[270px] gap-4 px-4 py-6 sm:min-h-[320px] sm:px-6 sm:py-8 lg:grid-cols-[1.4fr_1fr] lg:px-10">
          <div className="flex flex-col justify-center gap-4 text-slate-950">
            <p className="inline-flex w-fit rounded-full bg-slate-900 px-4 py-1.5 text-sm font-black text-white">{billboard.badge}</p>
            <h1 id="home-discovery-title" className="max-w-[20ch] text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              {billboard.title}
            </h1>
            <div className="flex flex-wrap gap-2">
              <Link href={billboard.ctaHref} className="inline-flex h-12 items-center justify-center rounded-md bg-slate-900 px-7 text-base font-black text-white hover:bg-slate-800">
                {billboard.ctaLabel}
              </Link>
              <Link href="/books" className="inline-flex h-12 items-center justify-center rounded-md border border-slate-300 bg-white/95 px-7 text-base font-bold text-slate-800 hover:bg-white">
                اكتشف الكتب
              </Link>
            </div>
          </div>

          <aside className="hidden items-end justify-end lg:flex">
            <div className="grid w-full max-w-md gap-2.5 rounded-2xl bg-white/72 p-3 backdrop-blur-sm ring-1 ring-slate-200/90">
              {merchPanels[0]?.books.slice(0, 2).map((book) => (
                <Link key={book.id} href={`/books/${book.slug}`} className="grid grid-cols-[92px_1fr] overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <CoverImage src={book.coverImageUrl} alt={`غلاف ${book.title}`} width={184} height={260} className="h-full w-full bg-slate-100 object-contain p-2" />
                  <div className="space-y-1 p-2.5">
                    <p className="line-clamp-2 text-xs font-extrabold text-slate-900">{book.title}</p>
                    <p className="line-clamp-1 text-[11px] text-slate-600">{book.author}</p>
                    <p className="text-[11px] font-black text-rose-700">{book.pricingLabel}</p>
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>

      <div className="grid gap-2 border-b border-slate-200 bg-slate-100 px-2 py-2 sm:grid-cols-2 sm:px-3 sm:py-3 xl:grid-cols-4">
        {merchPanels.map((category, panelIndex) => (
          <section key={category.slug} className="h-full rounded-md border border-slate-200 bg-white p-3 shadow-sm" aria-label={`عروض ${category.name}`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="line-clamp-1 text-2xl font-black text-slate-900">{category.name}</h2>
              <Link href={`/books?category=${category.slug}`} className="text-xs font-bold text-slate-500 hover:text-slate-900">
                عرض الكل
              </Link>
            </div>

            {panelIndex === 0 && category.books[0] ? (
              <Link href={`/books/${category.books[0].slug}`} className="group block">
                <div className="overflow-hidden rounded-md bg-slate-100">
                  <CoverImage
                    src={category.books[0].coverImageUrl}
                    alt={`غلاف ${category.books[0].title}`}
                    width={420}
                    height={620}
                    className="h-[280px] w-full object-contain p-2.5 transition duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-extrabold text-slate-900">{category.books[0].title}</p>
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {category.books.map((book) => (
                  <Link key={book.id} href={`/books/${book.slug}`} className="group block">
                    <div className="overflow-hidden rounded-md bg-slate-100">
                      <CoverImage
                        src={book.coverImageUrl}
                        alt={`غلاف ${book.title}`}
                        width={220}
                        height={300}
                        className="h-28 w-full object-contain p-1.5 transition duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                    <p className="mt-1 line-clamp-1 text-[11px] font-bold text-slate-700">{book.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
