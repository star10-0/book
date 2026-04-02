import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BooksGrid } from "@/components/storefront";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/auth-session";
import { getPublicCurriculumLevelBySlug } from "@/lib/curriculum/public";
import { prisma } from "@/lib/prisma";

type CurriculumLevelPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: CurriculumLevelPageProps): Promise<Metadata> {
  const { slug } = await params;
  const level = await getPublicCurriculumLevelBySlug(slug);

  if (!level) {
    return {
      title: "المنهاج",
    };
  }

  return {
    title: `${level.nameAr} | المنهاج`,
    description: level.description ?? `الكتب المخصصة لمستوى ${level.nameAr} ضمن قسم المنهاج.`,
  };
}

export default async function CurriculumLevelPage({ params }: CurriculumLevelPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const level = await getPublicCurriculumLevelBySlug(slug);

  if (!level) {
    notFound();
  }

  const linkedBookIds = level.books.map((item) => item.book.id);

  const wishlistItems = user
    ? await prisma.wishlistItem.findMany({
        where: {
          userId: user.id,
          bookId: {
            in: linkedBookIds,
          },
        },
        select: {
          bookId: true,
        },
      })
    : [];

  const wishlistIds = new Set(wishlistItems.map((item) => item.bookId));

  const books = level.books.map((item) => {
    const reviewsCount = item.book.reviews.length;
    const averageRating = reviewsCount > 0 ? item.book.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewsCount : 0;

    return {
      id: item.book.id,
      slug: item.book.slug,
      title: item.book.titleAr,
      author: item.book.author.nameAr,
      category: item.book.category.nameAr,
      publisher:
        item.book.metadata && typeof item.book.metadata === "object" && !Array.isArray(item.book.metadata) && "publisher" in item.book.metadata
          ? String(item.book.metadata.publisher ?? "") || null
          : null,
      coverImageUrl: item.book.coverImageUrl,
      offers: item.book.offers,
      averageRating,
      reviewsCount,
      isWishlisted: wishlistIds.has(item.book.id),
      isLoggedIn: Boolean(user),
    };
  });

  return (
    <div className="store-shell space-y-6 pb-10 pt-6 sm:space-y-8 sm:pt-8">
      <section className="rounded-3xl border border-indigo-100 bg-gradient-to-l from-white via-indigo-50/60 to-violet-50/70 p-6 shadow-sm sm:p-8">
        <Link href="/curriculum" className="text-xs font-semibold text-indigo-700 hover:text-indigo-900">
          العودة إلى مستويات المنهاج
        </Link>
        <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">{level.nameAr}</h1>
        {level.description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">{level.description}</p> : null}
      </section>

      <BooksGrid books={books} />
      <SiteFooter />
    </div>
  );
}
