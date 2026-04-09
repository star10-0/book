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
    <section
      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-l from-slate-100 via-emerald-50 to-cyan-100 pb-4 pt-3 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.75)] sm:pb-5 sm:pt-4 lg:pb-6 lg:pt-5"
      aria-labelledby="home-discovery-title"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-900/15 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/80 to-transparent" aria-hidden />

      <div className="relative space-y-4 px-3 sm:px-4 lg:px-5">
        <div className="grid gap-3 lg:grid-cols-[1.45fr_1fr] lg:items-stretch">
          <div className="space-y-2 text-slate-900">
            <p className="inline-flex rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-700 ring-1 ring-slate-200">سوق الكتب الرقمية</p>
            <h1 id="home-discovery-title" className="text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
              اكتشف الكتب حسب التصنيف، العروض، وتفضيلات القراءة في واجهة واحدة
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-700 sm:text-base">
              واجهة تصفح مرتبة تساعدك على العثور على الكتب المناسبة بسرعة عبر أقسام واضحة وبطاقات منظمة.
            </p>
          </div>

          <aside className="rounded-2xl border border-slate-200/90 bg-white/95 p-3 text-slate-900 shadow-sm backdrop-blur-sm sm:p-4">
            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">{billboard.badge}</span>
            <h2 className="mt-2 text-lg font-black leading-snug">{billboard.title}</h2>
            <p className="mt-1 text-xs leading-6 text-slate-600">قسم ترويجي بارز لعرض أحدث التخفيضات ومجموعات القراءة المختارة.</p>
            <Link href={billboard.ctaHref} className="mt-3 inline-flex h-8 items-center justify-center rounded-md bg-slate-900 px-3 text-xs font-bold text-white hover:bg-slate-800">
              {billboard.ctaLabel}
            </Link>
          </aside>
        </div>

        <HomeCategoryDiscovery categories={categories} />
      </div>
    </section>
  );
}
