import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { HOME_BILLBOARD_FALLBACKS } from "@/lib/home-billboards";
import { SiteFooter } from "@/components/site-footer";
import { HomeDiscoveryHero } from "@/components/home/home-discovery-hero";
import { StorefrontBannerList } from "@/components/home/storefront-banner-list";
import { formatArabicCurrency } from "@/lib/formatters/intl";
import { BannerPlacement, getActiveBannersByPlacement } from "@/lib/storefront-banners";
import { HomeMerchandisingRows, HomeRecommendationRail } from "@/components/home/home-merchandising-sections";

export const metadata: Metadata = {
  title: "الرئيسية",
  description: "تصفح متجر Amjad العربي للكتب الرقمية بحرية، مع شراء أو استئجار عند تسجيل الدخول.",
};

function getPricingLabel(
  offers: Array<{ priceCents: number; currency: string; type: "PURCHASE" | "RENTAL"; rentalDays: number | null }>,
) {
  if (offers.length === 0) {
    return "عرض السعر قريبًا";
  }

  const cheapest = [...offers].sort((first, second) => first.priceCents - second.priceCents)[0];
  const value = formatArabicCurrency(cheapest.priceCents / 100, { currency: cheapest.currency });

  if (cheapest.type === "RENTAL") {
    return cheapest.rentalDays ? `استئجار من ${value} · ${cheapest.rentalDays} يوم` : `استئجار من ${value}`;
  }

  return `شراء من ${value}`;
}

export default async function HomePage() {
  const [recommendedBooks, discoveryCategories, homeHeroBanners, secondaryBanners] = await Promise.all([
    prisma.book.findMany({
      where: {
        status: "PUBLISHED",
        format: "DIGITAL",
        offers: {
          some: { isActive: true },
        },
      },
      take: 24,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { nameAr: true } },
        category: { select: { nameAr: true } },
        offers: {
          where: { isActive: true },
          orderBy: { priceCents: "asc" },
          select: {
            id: true,
            type: true,
            priceCents: true,
            currency: true,
            rentalDays: true,
          },
        },
        reviews: { select: { rating: true } },
      },
    }),
    prisma.category.findMany({
      where: {
        books: {
          some: {
            status: "PUBLISHED",
            format: "DIGITAL",
          },
        },
      },
      orderBy: { books: { _count: "desc" } },
      take: 16,
      select: {
        slug: true,
        nameAr: true,
        description: true,
        books: {
          where: {
            status: "PUBLISHED",
            format: "DIGITAL",
          },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: {
            id: true,
            slug: true,
            titleAr: true,
            coverImageUrl: true,
            author: { select: { nameAr: true } },
            reviews: { select: { rating: true } },
            offers: {
              where: { isActive: true },
              select: {
                type: true,
                priceCents: true,
                currency: true,
                rentalDays: true,
              },
            },
          },
        },
      },
    }),
    getActiveBannersByPlacement(BannerPlacement.HOME_HERO, 3),
    getActiveBannersByPlacement(BannerPlacement.SECONDARY, 4),
  ]);

  const fallbackBillboard = HOME_BILLBOARD_FALLBACKS[0];
  const recommendationRailBooks = recommendedBooks.slice(0, 18).map((book) => ({
    id: book.id,
    slug: book.slug,
    title: book.titleAr,
    coverImageUrl: book.coverImageUrl,
  }));
  const categoryMerchandisingBlocks = discoveryCategories
    .filter((category) => category.books.length >= 4)
    .map((category) => ({
      id: category.slug,
      label: category.nameAr,
      href: `/catalog/${category.slug}`,
      books: category.books.slice(0, 4).map((book) => ({
        id: book.id,
        slug: book.slug,
        title: book.titleAr,
        coverImageUrl: book.coverImageUrl,
      })),
    }));
  const fallbackBookCovers = recommendedBooks.map((book) => ({
    id: book.id,
    slug: book.slug,
    title: book.titleAr,
    coverImageUrl: book.coverImageUrl,
  }));
  const fallbackBlocks = Array.from({ length: Math.floor(fallbackBookCovers.length / 4) }, (_, index) => {
    const start = index * 4;
    return {
      id: `latest-${index + 1}`,
      label: `اكتشاف رقمي ${index + 1}`,
      href: "/books",
      books: fallbackBookCovers.slice(start, start + 4),
    };
  });
  const mergedBlocks = [...categoryMerchandisingBlocks, ...fallbackBlocks].filter((block) => block.books.length === 4);
  const paddedBlocks = [...mergedBlocks];

  if (paddedBlocks.length > 0 && paddedBlocks.length < 4) {
    let loopIndex = 0;
    while (paddedBlocks.length < 4) {
      const candidate = mergedBlocks[loopIndex % mergedBlocks.length];
      paddedBlocks.push({
        ...candidate,
        id: `${candidate.id}-repeat-${loopIndex + 1}`,
      });
      loopIndex += 1;
    }
  }

  const fullRowsBlocksCount = Math.floor(paddedBlocks.length / 4) * 4;
  const merchandisingBlocks = paddedBlocks.slice(0, fullRowsBlocksCount);
  const secondaryRecommendationRailBooks =
    recommendationRailBooks.slice(9, 18).length === 9 ? recommendationRailBooks.slice(9, 18) : recommendationRailBooks.slice(0, 9);
  const secondaryMerchandisingBlocks =
    merchandisingBlocks.slice(4, 8).length === 4 ? merchandisingBlocks.slice(4, 8) : merchandisingBlocks.slice(0, 4);

  return (
    <main className="-mx-4 bg-gradient-to-b from-[#FCFCF9] via-[#FAFAF7] to-[#FCFCF9] sm:-mx-6 lg:-mx-8">
      <div className="-mt-2 space-y-0 pb-5 sm:-mt-3 lg:-mt-4">
        <HomeDiscoveryHero
          billboard={fallbackBillboard}
          heroBanners={homeHeroBanners}
          categories={discoveryCategories
            .map((category) => ({
              slug: category.slug,
              name: category.nameAr,
              description: category.description ?? "تصفح مجموعة مختارة بعناية من هذا التصنيف.",
              books: category.books.map((book) => ({
                id: book.id,
                slug: book.slug,
                title: book.titleAr,
                author: book.author.nameAr,
                coverImageUrl: book.coverImageUrl,
                averageRating:
                  book.reviews.length > 0
                    ? book.reviews.reduce((sum, review) => sum + review.rating, 0) / book.reviews.length
                    : 0,
                reviewsCount: book.reviews.length,
                pricingLabel: getPricingLabel(book.offers),
              })),
            }))
            .filter((category) => category.books.length > 0)}
        />
        <StorefrontBannerList banners={secondaryBanners} />

        <HomeRecommendationRail books={recommendationRailBooks} />

        <HomeMerchandisingRows blocks={merchandisingBlocks} />

        <HomeRecommendationRail books={secondaryRecommendationRailBooks} />

        <HomeMerchandisingRows blocks={secondaryMerchandisingBlocks} />
      </div>
      <SiteFooter />
    </main>
  );
}
