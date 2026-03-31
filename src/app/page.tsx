import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  CategoriesPreviewSection,
  FeaturedBooksSection,
  HeroSection,
  PromoHighlightsSection,
  RecommendedBooksSection,
} from "@/components/storefront";

export const metadata: Metadata = {
  title: "الرئيسية",
  description: "تصفح متجر Amjad العربي للكتب الرقمية بحرية، مع شراء أو استئجار عند تسجيل الدخول.",
};

export default async function HomePage() {
  const [featuredBooks, categories, recommendedBooks] = await Promise.all([
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
  ]);

  return (
    <main className="bg-gradient-to-b from-slate-100 via-slate-50 to-white">
      <SiteHeader />
      <div className="space-y-5 pb-8 sm:space-y-6">
        <HeroSection />
        <PromoHighlightsSection
          categories={categories.map((category) => ({
            name: category.nameAr,
            description: category.description ?? "مجموعة متنوعة من الكتب المختارة بعناية.",
          }))}
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
