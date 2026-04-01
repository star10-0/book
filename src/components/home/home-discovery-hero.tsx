import Link from "next/link";
import type { HomeBillboard } from "@/lib/home-billboards";
import { HomeCategoryDiscovery, type DiscoveryCategory } from "@/components/home/home-category-discovery";

type HomeDiscoveryHeroProps = {
  billboard: HomeBillboard;
  categories: DiscoveryCategory[];
};

export function HomeDiscoveryHero({ billboard, categories }: HomeDiscoveryHeroProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-indigo-200/60 bg-gradient-to-l from-slate-950 via-indigo-900 to-violet-700 p-4 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.9)] sm:p-6 lg:p-8" aria-labelledby="home-discovery-title">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_45%)]" aria-hidden />
      <div className="pointer-events-none absolute -start-24 top-16 h-52 w-52 rounded-full bg-fuchsia-300/20 blur-3xl" aria-hidden />

      <div className="relative space-y-4 sm:space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr] lg:items-stretch">
          <div className="space-y-3 text-white">
            <p className="text-[11px] font-semibold tracking-wide text-indigo-100">سوق الكتب الرقمية</p>
            <h1 id="home-discovery-title" className="text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
              اكتشف الكتب حسب التصنيف، العروض، وتفضيلات القراءة في واجهة واحدة
            </h1>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link href="/books" className="inline-flex h-9 items-center justify-center rounded-md bg-amber-300 px-4 text-xs font-bold text-slate-900 hover:bg-amber-200">
                ابدأ التسوق
              </Link>
              <Link href="/books?offer=rent" className="inline-flex h-9 items-center justify-center rounded-md border border-indigo-200/70 bg-white/10 px-4 text-xs font-semibold text-white hover:bg-white/20">
                تصفح الاستئجار
              </Link>
              <Link href="/books?sort=rating" className="inline-flex h-9 items-center justify-center rounded-md border border-indigo-200/70 bg-white/10 px-4 text-xs font-semibold text-white hover:bg-white/20">
                الأعلى تقييمًا
              </Link>
            </div>
          </div>

          <aside className="rounded-2xl border border-white/20 bg-white/10 p-4 text-white shadow-sm backdrop-blur-sm">
            <span className="inline-flex rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold">{billboard.badge}</span>
            <h2 className="mt-3 text-lg font-black leading-snug">{billboard.title}</h2>
            <Link href={billboard.ctaHref} className="mt-4 inline-flex h-8 items-center justify-center rounded-md bg-white px-3 text-xs font-bold text-indigo-900 hover:bg-indigo-50">
              {billboard.ctaLabel}
            </Link>
          </aside>
        </div>

        <div className="rounded-2xl border border-white/20 bg-black/15 px-4 py-3 text-white/90">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 4).map((category) => (
                <Link
                  key={category.slug}
                  href={`/books?category=${category.slug}`}
                  className="inline-flex h-8 items-center rounded-full border border-white/30 bg-white/10 px-3 text-[11px] font-semibold hover:bg-white/20"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <HomeCategoryDiscovery categories={categories} />
      </div>
    </section>
  );
}
