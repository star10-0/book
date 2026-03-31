import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { HOME_BILLBOARD_FALLBACKS } from "@/lib/home-billboards";
import { SiteFooter } from "@/components/site-footer";
import { HomeDiscoveryHero } from "@/components/home/home-discovery-hero";
import {
  CategoriesPreviewSection,
  FeaturedBooksSection,
  RecommendedBooksSection,
} from "@/components/storefront";
import { formatArabicCurrency } from "@/lib/formatters/intl";

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
  const [featuredBooks, categories, recommendedBooks, discoveryCategories] = await Promise.all([
    prisma.book.findMany({
      where: { status: "PUBLISHED", format: "DIGITAL" },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        author: { select: { nameAr: true } },
        category: { select: { nameAr: true } },
        reviews: { select: { rating: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: { books: { _count: "desc" } },
      take: 4,
      select: {
        nameAr: true,
        description: true,
      },
    }),
    prisma.book.findMany({
      where: {
        status: "PUBLISHED",
        format: "DIGITAL",
        offers: {
          some: { isActive: true },
        },
      },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { nameAr: true } },
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
      take: 6,
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
          take: 8,
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
  ]);

  const fallbackBillboard = HOME_BILLBOARD_FALLBACKS[0];

  return (
    <main className="bg-gradient-to-b from-slate-100 via-slate-50 to-white">
      <div className="space-y-5 pb-8 sm:space-y-6">
        <HomeDiscoveryHero
          billboard={fallbackBillboard}
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

        <FeaturedBooksSection
          books={featuredBooks.map((book) => ({
            id: book.id,
            slug: book.slug,
            title: book.titleAr,
            author: book.author.nameAr,
            category: book.category.nameAr,
            coverImageUrl: book.coverImageUrl,
            averageRating:
              book.reviews.length > 0
                ? book.reviews.reduce((sum, review) => sum + review.rating, 0) / book.reviews.length
                : 0,
            reviewsCount: book.reviews.length,
          }))}
        />

        <RecommendedBooksSection
          books={recommendedBooks
            .map((book, index) => {
              const reviewsCount = book.reviews.length;
              const averageRating = reviewsCount > 0 ? book.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewsCount : 0;

              return {
                id: book.id,
                slug: book.slug,
                title: book.titleAr,
                author: book.author.nameAr,
                coverImageUrl: book.coverImageUrl,
                rank: index,
                reviewsCount,
                averageRating,
              };
            })
            .sort((a, b) => {
              if (b.averageRating === a.averageRating) {
                return b.reviewsCount - a.reviewsCount;
              }

              return b.averageRating - a.averageRating;
            })
            .slice(0, 3)
            .map((book) => ({
              id: book.id,
              slug: book.slug,
              title: book.title,
              author: book.author,
              coverImageUrl: book.coverImageUrl,
              reason:
                book.reviewsCount > 0
                  ? `تقييم ${book.averageRating.toFixed(1)} من ${book.reviewsCount} مراجعة`
                  : "ضمن أحدث الكتب المضافة",
            }))}
        />

        <CategoriesPreviewSection
          categories={categories.map((category) => ({
            name: category.nameAr,
            description: category.description ?? "مجموعة متنوعة من الكتب المختارة بعناية.",
          }))}
        />
      </div>
      <SiteFooter />
    </main>
  );
}
