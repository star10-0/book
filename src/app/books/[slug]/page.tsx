import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  BookDetailsSection,
  BookReviewsSection,
  RelatedBooksSection,
} from "@/components/book-details";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

type BookDetailsPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: BookDetailsPageProps): Promise<Metadata> {
  const { slug } = await params;

  const book = await prisma.book.findFirst({
    where: { slug, status: "PUBLISHED", format: "DIGITAL" },
    select: { titleAr: true, descriptionAr: true },
  });

  if (!book) {
    return {
      title: "الكتاب غير موجود",
      description: "تعذر العثور على هذا الكتاب في المنصة.",
    };
  }

  return {
    title: book.titleAr,
    description: book.descriptionAr ?? `تصفح تفاصيل كتاب ${book.titleAr} وخيارات الشراء أو الاستئجار.`,
  };
}

export default async function BookDetailsPage({ params }: BookDetailsPageProps) {
  const user = await getCurrentUser();
  const { slug } = await params;

  const book = await prisma.book.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
      format: "DIGITAL",
    },
    include: {
      author: { select: { nameAr: true } },
      category: { select: { id: true, nameAr: true } },
      offers: {
        where: {
          isActive: true,
          OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }],
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          type: true,
          priceCents: true,
          currency: true,
          rentalDays: true,
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      },
      wishlistItems: user
        ? {
            where: { userId: user.id },
            select: { id: true },
          }
        : false,
    },
  });

  if (!book) {
    notFound();
  }

  const relatedBooks = await prisma.book.findMany({
    where: {
      status: "PUBLISHED",
      format: "DIGITAL",
      categoryId: book.category.id,
      id: { not: book.id },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
    include: {
      author: { select: { nameAr: true } },
    },
  });

  const reviewsCount = book.reviews.length;
  const averageRating =
    reviewsCount > 0
      ? book.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewsCount
      : 0;

  const userReview = user
    ? book.reviews.find((review) => review.userId === user.id) ?? null
    : null;

  return (
    <main>
      <SiteHeader />
      <div className="space-y-6">
        <BookDetailsSection
          book={{
            id: book.id,
            slug: book.slug,
            title: book.titleAr,
            author: book.author.nameAr,
            category: book.category.nameAr,
            description: book.descriptionAr,
            coverImageUrl: book.coverImageUrl,
            publicationDate: book.publicationDate,
            metadata: book.metadata,
          }}
          offers={book.offers}
          averageRating={averageRating}
          reviewsCount={reviewsCount}
          isLoggedIn={Boolean(user)}
          isWishlisted={Boolean(book.wishlistItems?.length)}
          userReview={
            userReview
              ? {
                  rating: userReview.rating,
                  comment: userReview.comment,
                }
              : null
          }
        />

        <BookReviewsSection
          bookId={book.id}
          slug={book.slug}
          averageRating={averageRating}
          reviewsCount={reviewsCount}
          isLoggedIn={Boolean(user)}
          userReview={
            userReview
              ? {
                  rating: userReview.rating,
                  comment: userReview.comment,
                }
              : null
          }
          reviews={book.reviews.map((review) => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt,
            userName: review.user.fullName ?? review.user.email,
          }))}
        />

        <RelatedBooksSection
          books={relatedBooks.map((relatedBook) => ({
            id: relatedBook.id,
            slug: relatedBook.slug,
            title: relatedBook.titleAr,
            author: relatedBook.author.nameAr,
            coverImageUrl: relatedBook.coverImageUrl,
          }))}
        />
      </div>
      <SiteFooter />
    </main>
  );
}
