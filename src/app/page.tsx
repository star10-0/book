import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  CategoriesPreviewSection,
  FeaturedBooksSection,
  HeroSection,
  RecommendedBooksSection,
} from "@/components/storefront";

export const metadata: Metadata = {
  title: "الرئيسية",
  description: "اكتشف أحدث الكتب الرقمية العربية للشراء والاستئجار عبر تجربة قراءة حديثة وسريعة.",
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
    <main>
      <SiteHeader />
      <div className="space-y-8 sm:space-y-10">
        <HeroSection />

        <section className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">تجربة التسوق</p>
            <p className="mt-1 text-sm font-bold text-slate-900">شراء أو استئجار بسهولة</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">المحتوى</p>
            <p className="mt-1 text-sm font-bold text-slate-900">تصنيفات متنوعة وكتب حديثة</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">بعد الشراء</p>
            <p className="mt-1 text-sm font-bold text-slate-900">الوصول الفوري داخل مكتبتك</p>
          </div>
        </section>

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
                  : `ضمن أحدث الكتب المضافة`,
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
