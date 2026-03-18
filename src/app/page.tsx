import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  CategoriesPreviewSection,
  FeaturedBooksSection,
  HeroSection,
} from "@/components/storefront";

export const metadata: Metadata = {
  title: "الرئيسية",
  description: "اكتشف أحدث الكتب الرقمية العربية للشراء والاستئجار عبر تجربة قراءة حديثة وسريعة.",
};

export default async function HomePage() {
  const [featuredBooks, categories] = await Promise.all([
    prisma.book.findMany({
      where: { status: "PUBLISHED", format: "DIGITAL" },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        author: { select: { nameAr: true } },
        category: { select: { nameAr: true } },
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
  ]);

  return (
    <main>
      <SiteHeader />
      <HeroSection />
      <FeaturedBooksSection
        books={featuredBooks.map((book) => ({
          id: book.id,
          title: book.titleAr,
          author: book.author.nameAr,
          category: book.category.nameAr,
          coverImageUrl: book.coverImageUrl,
        }))}
      />
      <CategoriesPreviewSection
        categories={categories.map((category) => ({
          name: category.nameAr,
          description: category.description ?? "مجموعة متنوعة من الكتب المختارة بعناية.",
        }))}
      />
      <SiteFooter />
    </main>
  );
}
