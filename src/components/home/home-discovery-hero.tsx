"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { HomeBillboard } from "@/lib/home-billboards";
import type { DiscoveryCategory } from "@/components/home/home-category-discovery";
import { CoverImage } from "@/components/ui/cover-image";

type HomeDiscoveryHeroProps = {
  billboard: HomeBillboard;
  categories: DiscoveryCategory[];
  heroBanners?: HomeHeroBannerSlide[];
};

type HomeHeroBannerSlide = {
  id: string;
  desktopImageUrl: string;
  mobileImageUrl: string | null;
  clickUrl: string | null;
  altText: string;
};

type HeroShowcaseBookCard = {
  id: string;
  title: string;
  author: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
};

type HeroShowcasePanel = {
  id: string;
  title: string;
  href: string;
  cards: HeroShowcaseBookCard[];
  featured?: boolean;
};

const HERO_BANNER_IMAGE = "/home-deals/banner/mothers-day-hero.jpg";
const HERO_AUTOPLAY_MS = 5000;
const PREFERRED_CATEGORY_NAMES = ["أدب", "روايات", "تطوير ذات", "تاريخ", "فكر وثقافة"] as const;

function isSafeBannerUrl(url: string | null) {
  if (!url) return false;
  if (url.startsWith("/")) return true;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function buildPanels(categories: DiscoveryCategory[]): HeroShowcasePanel[] {
  const preferred = PREFERRED_CATEGORY_NAMES.map((name) => categories.find((category) => category.name === name)).filter(
    (category): category is DiscoveryCategory => Boolean(category),
  );
  const remaining = categories.filter((category) => !preferred.some((preferredCategory) => preferredCategory.slug === category.slug));
  const selectedCategories = [...preferred, ...remaining].slice(0, 4);

  return selectedCategories.map((category, categoryIndex) => ({
    id: category.slug,
    title: category.name,
    href: `/catalog/${category.slug}`,
    featured: categoryIndex === 0,
    cards: category.books.slice(0, 4).map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      href: `/books/${book.slug}`,
      imageSrc: book.coverImageUrl ?? "/icons/source-book-icon.svg",
      imageAlt: `غلاف كتاب ${book.title}`,
    })),
  }));
}

export function HomeDiscoveryHero({ billboard, categories, heroBanners = [] }: HomeDiscoveryHeroProps) {
  const hasCategories = categories.length > 0;
  const showcasePanels = useMemo(() => buildPanels(categories), [categories]);
  const slides = useMemo(() => {
    if (heroBanners.length > 0) {
      return heroBanners;
    }

    return [
      {
        id: "fallback-banner",
        desktopImageUrl: HERO_BANNER_IMAGE,
        mobileImageUrl: null,
        clickUrl: null,
        altText: "عروض كتب رقمية مميزة",
      },
    ];
  }, [heroBanners]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    setCurrentSlide(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentSlide((previous) => (previous + 1) % slides.length);
    }, HERO_AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  const activeSlide = slides[currentSlide] ?? slides[0];
  const goNext = () => {
    setCurrentSlide((previous) => (previous + 1) % slides.length);
  };
  const goPrevious = () => {
    setCurrentSlide((previous) => (previous - 1 + slides.length) % slides.length);
  };

  return (
    <section className="relative" aria-labelledby="home-discovery-title">
      <h1 id="home-discovery-title" className="sr-only">
        {billboard.title}
      </h1>

      <div className="relative w-full overflow-hidden border-b border-slate-300 bg-[#cde8d6]">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-14 bg-gradient-to-b from-slate-950/35 to-transparent" />
        <div className="relative min-h-[200px] sm:min-h-[260px] lg:min-h-[330px]">
          {isSafeBannerUrl(activeSlide.clickUrl) ? (
            <Link href={activeSlide.clickUrl as string} aria-label={activeSlide.altText} className="absolute inset-0 block">
              {activeSlide.mobileImageUrl ? (
                <>
                  <CoverImage
                    src={activeSlide.mobileImageUrl}
                    alt={activeSlide.altText}
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover object-[center_30%] md:hidden"
                  />
                  <CoverImage
                    src={activeSlide.desktopImageUrl}
                    alt={activeSlide.altText}
                    fill
                    priority
                    sizes="100vw"
                    className="hidden object-cover object-[center_30%] md:block"
                  />
                </>
              ) : (
                <CoverImage
                  src={activeSlide.desktopImageUrl}
                  alt={activeSlide.altText}
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover object-[center_30%]"
                />
              )}
            </Link>
          ) : (
            <>
              {activeSlide.mobileImageUrl ? (
                <>
                  <CoverImage
                    src={activeSlide.mobileImageUrl}
                    alt={activeSlide.altText}
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover object-[center_30%] md:hidden"
                  />
                  <CoverImage
                    src={activeSlide.desktopImageUrl}
                    alt={activeSlide.altText}
                    fill
                    priority
                    sizes="100vw"
                    className="hidden object-cover object-[center_30%] md:block"
                  />
                </>
              ) : (
                <CoverImage
                  src={activeSlide.desktopImageUrl}
                  alt={activeSlide.altText}
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover object-[center_30%]"
                />
              )}
            </>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#cde8d6]/45" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#eaedef] via-[#eaedef]/55 to-transparent" />

          <button
            type="button"
            onClick={goPrevious}
            className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white/90 text-lg text-slate-700 shadow-sm sm:left-4"
            aria-label="السابق"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white/90 text-lg text-slate-700 shadow-sm sm:right-4"
            aria-label="التالي"
          >
            ›
          </button>
        </div>
      </div>

      <div className="relative z-10 -mt-24 grid grid-cols-1 gap-2 px-0 sm:-mt-28 sm:grid-cols-2 sm:gap-2.5 lg:-mt-32 lg:grid-cols-4 lg:gap-3" dir="rtl">
        {showcasePanels.map((panel) => {
          if (panel.featured) {
            const featuredCard = panel.cards[0];
            if (!featuredCard) {
              return null;
            }

            return (
              <section key={panel.id} className="h-full border border-slate-200 bg-white p-3 sm:p-4" aria-label={`كتب ${panel.title}`}>
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
                  <p className="mt-1.5 line-clamp-1 text-xs font-semibold text-slate-800">{featuredCard.title}</p>
                  <p className="line-clamp-1 text-[11px] text-slate-600">{featuredCard.author}</p>
                </Link>
              </section>
            );
          }

          return (
            <section
              key={panel.id}
              className="h-full border border-slate-200 bg-white p-3 sm:p-4"
              aria-label={`كتب ${panel.title}`}
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
                    <p className="mt-1 line-clamp-1 text-[11px] font-medium text-slate-700">{card.title}</p>
                    <p className="line-clamp-1 text-[10px] text-slate-500">{card.author}</p>
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
