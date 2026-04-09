import Link from "next/link";
import type { HomeBillboard } from "@/lib/home-billboards";
import { HomeCategoryDiscovery, type DiscoveryCategory } from "@/components/home/home-category-discovery";
import { CoverImage } from "@/components/ui/cover-image";

type HomeDiscoveryHeroProps = {
  billboard: HomeBillboard;
  categories: DiscoveryCategory[];
};

export function HomeDiscoveryHero({ billboard, categories }: HomeDiscoveryHeroProps) {
  if (categories.length === 0) {
    return null;
  }

  const quickBooks = categories.flatMap((category) => category.books).slice(0, 3);

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-slate-300/80 bg-gradient-to-l from-sky-100 via-slate-100 to-slate-200 pb-3 pt-2.5 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.8)] sm:pb-4 sm:pt-3 lg:pb-5 lg:pt-4"
      aria-labelledby="home-discovery-title"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-slate-950/35 via-slate-950/10 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute -top-16 left-[-4rem] h-44 w-44 rounded-full bg-white/35 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -top-12 right-[-4rem] h-52 w-52 rounded-full bg-cyan-200/70 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/75 to-transparent" aria-hidden />

      <div className="relative space-y-3 px-3 sm:px-4 lg:px-5">
        <div className="grid gap-3 lg:grid-cols-[1.8fr_1fr] lg:items-stretch">
          <div className="flex min-h-[210px] flex-col justify-between rounded-2xl border border-slate-200/90 bg-white/80 p-4 text-slate-900 shadow-sm backdrop-blur-sm sm:p-5 lg:min-h-[250px]">
            <div className="space-y-2.5">
              <p className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white">{billboard.badge}</p>
              <h1 id="home-discovery-title" className="line-clamp-2 text-2xl font-black leading-tight sm:text-3xl lg:text-[2rem]">
                {billboard.title}
              </h1>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold sm:text-xs">
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700">شراء مباشر</span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700">استئجار مرن</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={billboard.ctaHref} className="inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800">
                {billboard.ctaLabel}
              </Link>
              <Link href="/books" className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                اكتشف الكتب
              </Link>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200/90 bg-white/95 p-3 text-slate-900 shadow-sm backdrop-blur-sm sm:p-4">
            <h2 className="text-sm font-black text-slate-900 sm:text-base">عروض سريعة اليوم</h2>
            <div className="mt-2 grid gap-2 text-[11px] sm:text-xs">
              <Link href="/books?offer=buy" className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 font-semibold text-slate-700 hover:bg-slate-100">
                خصومات على الشراء الرقمي
              </Link>
              <Link href="/books?offer=rent" className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 font-semibold text-slate-700 hover:bg-slate-100">
                خيارات إعارة قصيرة وطويلة
              </Link>
              <Link href="/books?sort=newest" className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 font-semibold text-slate-700 hover:bg-slate-100">
                أحدث الإصدارات المضافة
              </Link>
            </div>
          </aside>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {quickBooks.map((book) => (
            <article key={book.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Link href={`/books/${book.slug}`} className="block">
                <CoverImage
                  src={book.coverImageUrl}
                  alt={`غلاف ${book.title}`}
                  width={300}
                  height={430}
                  className="h-40 w-full bg-slate-100 object-contain p-2 transition duration-300 group-hover:scale-[1.02]"
                />
                <div className="space-y-1 p-3">
                  <h3 className="line-clamp-1 text-sm font-extrabold text-slate-900">{book.title}</h3>
                  <p className="line-clamp-1 text-[11px] text-slate-600">{book.author}</p>
                  <p className="text-xs font-bold text-rose-700">{book.pricingLabel}</p>
                </div>
              </Link>
            </article>
          ))}
        </div>

        <HomeCategoryDiscovery categories={categories} />
      </div>
    </section>
  );
}
