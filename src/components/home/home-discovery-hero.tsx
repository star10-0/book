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
};

const HERO_BANNER_IMAGE = "/home-deals/banner/mothers-day-hero.jpg";

const HERO_SHOWCASE_PANELS: HeroShowcasePanel[] = [
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
        title: "جينز بأقل من 50 دولارًا",
        href: "/books",
        imageSrc: "/home-deals/panels/fashion-under-50/jeans.jpg",
        imageAlt: "صورة جينز ضمن عروض أقل من 50 دولارًا",
      },
      {
        id: "fashion-shirts",
        title: "قمصان بأقل من 25 دولارًا",
        href: "/books",
        imageSrc: "/home-deals/panels/fashion-under-50/shirts.jpg",
        imageAlt: "صورة قمصان ضمن عروض أقل من 25 دولارًا",
      },
      {
        id: "fashion-dresses",
        title: "فساتين بأقل من 30 دولارًا",
        href: "/books",
        imageSrc: "/home-deals/panels/fashion-under-50/dresses.jpg",
        imageAlt: "صورة فساتين ضمن عروض أقل من 30 دولارًا",
      },
      {
        id: "fashion-boots",
        title: "أحذية بأقل من 50 دولارًا",
        href: "/books",
        imageSrc: "/home-deals/panels/fashion-under-50/boots.jpg",
        imageAlt: "صورة أحذية ضمن عروض أقل من 50 دولارًا",
      },
    ],
  },
  {
    id: "home-under-50",
    title: "منازل جديدة بأسعار أقل من 50 دولارًا",
    href: "/books",
    cards: [
      {
        id: "home-kitchen",
        title: "المطبخ وغرفة الطعام",
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
        title: "أغطية الأسرّة والحمّامات",
        href: "/books",
        imageSrc: "/home-deals/panels/home-under-50/bedding.jpg",
        imageAlt: "صورة أغطية أسرّة ضمن العروض",
      },
    ],
  },
  {
    id: "game-ready",
    title: "استعد للعبة!",
    href: "/books",
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
];

export function HomeDiscoveryHero({ billboard, categories }: HomeDiscoveryHeroProps) {
  const hasCategories = categories.length > 0;

  return (
    <section className="space-y-0" aria-labelledby="home-discovery-title">
      <h1 id="home-discovery-title" className="sr-only">
        {billboard.title}
      </h1>

      <div className="relative overflow-hidden border-y border-slate-300 bg-[#cde8d6]">
        <div className="mx-auto grid max-w-[1800px] grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-2 sm:px-4 sm:py-3">
          <button
            type="button"
            className="z-10 h-9 w-9 rounded-full border border-slate-300 bg-white/85 text-lg text-slate-700 shadow-sm"
            aria-label="السابق"
          >
            ‹
          </button>

          <div className="relative min-h-[180px] overflow-hidden sm:min-h-[240px] lg:min-h-[300px]">
            <CoverImage
              src={HERO_BANNER_IMAGE}
              alt="عروض خاصة بعيد الأم"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 1600px"
              className="object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#cde8d6]/45" />
          </div>

          <button
            type="button"
            className="z-10 h-9 w-9 rounded-full border border-slate-300 bg-white/85 text-lg text-slate-700 shadow-sm"
            aria-label="التالي"
          >
            ›
          </button>
        </div>
      </div>

      <div className="relative z-10 -mt-10 grid gap-2 border-b border-slate-200 bg-transparent px-0 pb-0 sm:-mt-16 sm:grid-cols-2 sm:gap-2.5 lg:-mt-20 lg:grid-cols-4">
        {HERO_SHOWCASE_PANELS.map((panel) => {
          const isGamePanel = panel.id === "game-ready";

          return (
            <section key={panel.id} className="h-full border border-slate-200 bg-white p-3 sm:p-4" aria-label={`عروض ${panel.title}`}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="line-clamp-1 text-2xl font-black text-slate-900">{panel.title}</h2>
                <Link href={panel.href} className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                  المزيد
                </Link>
              </div>

              {isGamePanel ? (
                <Link href={panel.cards[0].href} className="group block">
                  <div className="overflow-hidden border border-slate-200 bg-slate-100">
                    <CoverImage
                      src={panel.cards[0].imageSrc}
                      alt={panel.cards[0].imageAlt}
                      width={640}
                      height={640}
                      className="h-[430px] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                  <p className="mt-2 text-base font-medium text-slate-700">{panel.cards[0].title}</p>
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {panel.cards.map((card) => (
                    <Link key={card.id} href={card.href} className="group block">
                      <div className="overflow-hidden border border-slate-200 bg-slate-100">
                        <CoverImage
                          src={card.imageSrc}
                          alt={card.imageAlt}
                          width={300}
                          height={220}
                          className="h-36 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-slate-700">{card.title}</p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {!hasCategories ? (
        <p className="sr-only" aria-live="polite">
          لا توجد تصنيفات مرتبطة بالواجهة الرئيسية حاليًا.
        </p>
      ) : null}
    </section>
  );
}
