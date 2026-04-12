import Link from "next/link";
import type { HomeBillboard } from "@/lib/home-billboards";
import type { DiscoveryCategory } from "@/components/home/home-category-discovery";
import { CoverImage } from "@/components/ui/cover-image";

type HomeDiscoveryHeroProps = {
  billboard: HomeBillboard;
  categories: DiscoveryCategory[];
};

type HeroShowcaseCard = {
  id: string;
  title: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
};

type HeroShowcasePanel = {
  id: string;
  title: string;
  href: string;
  cards: HeroShowcaseCard[];
  featured?: boolean;
};

const HERO_BANNER_IMAGE = "/home-deals/banner/mothers-day-hero.jpg";

const HERO_SHOWCASE_PANELS: HeroShowcasePanel[] = [
  {
    id: "game-ready",
    title: "استعد للعبة!",
    href: "/books",
    featured: true,
    cards: [
      {
        id: "gaming-setup",
        title: "إعدادات الألعاب",
        href: "/books",
        imageSrc: "/home-deals/panels/game-ready/gaming-setup.jpg",
        imageAlt: "صورة جهاز ألعاب",
      },
    ],
  },
  {
    id: "gifts-for-mom",
    title: "ابحث عن هدايا للأم",
    href: "/books",
    cards: [
      {
        id: "gift-fashion",
        title: "ملابس",
        href: "/books",
        imageSrc: "/home-deals/panels/gifts-for-mom/fashion.jpg",
        imageAlt: "صورة ملابس هدايا للأم",
      },
      {
        id: "gift-shoes",
        title: "أحذية",
        href: "/books",
        imageSrc: "/home-deals/panels/gifts-for-mom/shoes.jpg",
        imageAlt: "صورة أحذية هدايا للأم",
      },
      {
        id: "gift-jewelry",
        title: "مجوهرات",
        href: "/books",
        imageSrc: "/home-deals/panels/gifts-for-mom/jewelry.jpg",
        imageAlt: "صورة مجوهرات هدايا للأم",
      },
      {
        id: "gift-bags",
        title: "حقائب اليد",
        href: "/books",
        imageSrc: "/home-deals/panels/gifts-for-mom/bags.jpg",
        imageAlt: "صورة حقائب يد هدايا للأم",
      },
    ],
  },
  {
    id: "fashion-under-50",
    title: "تسوّقي أزياء بأسعار أقل",
    href: "/books",
    cards: [
      {
        id: "fashion-jeans",
        title: "جينز بأقل من 50$",
        href: "/books",
        imageSrc: "/home-deals/panels/fashion-under-50/jeans.jpg",
        imageAlt: "صورة جينز ضمن عروض أقل من 50 دولارًا",
      },
      {
        id: "fashion-shirts",
        title: "قمصان بأقل من 25$",
        href: "/books",
        imageSrc: "/home-deals/panels/fashion-under-50/shirts.jpg",
        imageAlt: "صورة قمصان ضمن عروض أقل من 25 دولارًا",
      },
      {
        id: "fashion-dresses",
        title: "فساتين بأقل من 30$",
        href: "/books",
        imageSrc: "/home-deals/panels/fashion-under-50/dresses.jpg",
        imageAlt: "صورة فساتين ضمن عروض أقل من 30 دولارًا",
      },
      {
        id: "fashion-boots",
        title: "أحذية بأقل من 50$",
        href: "/books",
        imageSrc: "/home-deals/panels/fashion-under-50/boots.jpg",
        imageAlt: "صورة أحذية ضمن عروض أقل من 50 دولارًا",
      },
    ],
  },
  {
    id: "home-under-50",
    title: "مستلزمات منزل أقل من 50$",
    href: "/books",
    cards: [
      {
        id: "home-kitchen",
        title: "المطبخ والطعام",
        href: "/books",
        imageSrc: "/home-deals/panels/home-under-50/kitchen.jpg",
        imageAlt: "صورة أدوات مطبخ ضمن عروض المنزل",
      },
      {
        id: "home-upgrade",
        title: "تحسين المنزل",
        href: "/books",
        imageSrc: "/home-deals/panels/home-under-50/home-upgrade.jpg",
        imageAlt: "صورة أدوات تحسين المنزل ضمن العروض",
      },
      {
        id: "home-decor",
        title: "ديكور",
        href: "/books",
        imageSrc: "/home-deals/panels/home-under-50/decor.jpg",
        imageAlt: "صورة ديكور منزلي ضمن العروض",
      },
      {
        id: "home-bedding",
        title: "غرف النوم والحمام",
        href: "/books",
        imageSrc: "/home-deals/panels/home-under-50/bedding.jpg",
        imageAlt: "صورة أغطية أسرّة ضمن العروض",
      },
    ],
  },
];

export function HomeDiscoveryHero({ billboard, categories }: HomeDiscoveryHeroProps) {
  const hasCategories = categories.length > 0;

  return (
    <section className="relative" aria-labelledby="home-discovery-title">
      <h1 id="home-discovery-title" className="sr-only">
        {billboard.title}
      </h1>

      <div className="relative w-full overflow-hidden border-y border-slate-300 bg-[#cde8d6]">
        <div className="relative min-h-[220px] sm:min-h-[300px] lg:min-h-[390px]">
          <CoverImage
            src={HERO_BANNER_IMAGE}
            alt="عروض خاصة بعيد الأم"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#cde8d6]/45" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#eaedef] via-[#eaedef]/55 to-transparent" />

          <button
            type="button"
            className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white/90 text-lg text-slate-700 shadow-sm sm:left-4"
            aria-label="السابق"
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white/90 text-lg text-slate-700 shadow-sm sm:right-4"
            aria-label="التالي"
          >
            ›
          </button>
        </div>
      </div>

      <div className="relative z-10 -mt-24 grid grid-cols-1 gap-2 px-0 sm:-mt-28 sm:grid-cols-2 sm:gap-2.5 lg:-mt-32 lg:grid-cols-4 lg:gap-3" dir="rtl">
        {HERO_SHOWCASE_PANELS.map((panel) => {
          if (panel.featured) {
            const featuredCard = panel.cards[0];

            return (
              <section key={panel.id} className="h-full border border-slate-200 bg-white p-3 sm:p-4" aria-label={`عروض ${panel.title}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="line-clamp-1 text-base font-bold text-slate-900">{panel.title}</h2>
                  <Link href={panel.href} className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                    المزيد
                  </Link>
                </div>

                <Link href={featuredCard.href} className="group block">
                  <div className="overflow-hidden border border-slate-200 bg-slate-100">
                    <CoverImage
                      src={featuredCard.imageSrc}
                      alt={featuredCard.imageAlt}
                      width={640}
                      height={640}
                      className="h-[220px] w-full object-cover transition duration-300 group-hover:scale-[1.02] sm:h-[250px] lg:h-[280px]"
                    />
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-slate-700">{featuredCard.title}</p>
                </Link>
              </section>
            );
          }

          return (
            <section
              key={panel.id}
              className="h-full border border-slate-200 bg-white p-3 sm:p-4"
              aria-label={`عروض ${panel.title}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="line-clamp-1 text-base font-bold text-slate-900">{panel.title}</h2>
                <Link href={panel.href} className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                  المزيد
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {panel.cards.map((card) => (
                  <Link key={card.id} href={card.href} className="group block">
                    <div className="overflow-hidden border border-slate-200 bg-slate-100">
                      <CoverImage
                        src={card.imageSrc}
                        alt={card.imageAlt}
                        width={280}
                        height={210}
                        className="h-[88px] w-full object-cover transition duration-300 group-hover:scale-[1.03] sm:h-24"
                      />
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-slate-700">{card.title}</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {!hasCategories && (
        <p className="sr-only" aria-live="polite">
          لا توجد تصنيفات مرتبطة بالواجهة الرئيسية حاليًا.
        </p>
      )}
    </section>
  );
}