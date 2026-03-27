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
import { resolveBookContentAccess } from "@/lib/book-content-access";
import { getAppBaseUrl } from "@/lib/env";
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

  const appBaseUrl = getAppBaseUrl();

  return {
    title: book.titleAr,
    description: book.descriptionAr ?? `تصفح تفاصيل كتاب ${book.titleAr} وخيارات الشراء أو الاستئجار.`,
    alternates: {
      canonical: `/books/${slug}`,
    },
    openGraph: {
      title: book.titleAr,
      description: book.descriptionAr ?? `تصفح تفاصيل كتاب ${book.titleAr}.`,
      url: `${appBaseUrl}/books/${slug}`,
      type: "article",
      locale: "ar_SY",
    },
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
      files: {
        where: {
          kind: {
            in: ["PDF", "EPUB"],
          },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          kind: true,
          publicUrl: true,
        },
      },
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
  const contentAccess = resolveBookContentAccess({
    policy: book.contentAccessPolicy,
    files: book.files,
    textContent: book.textContent,
  });
  const hasOffers = book.offers.length > 0;
  const accessGuidance = contentAccess.canDownloadPublicly
    ? "هذا الكتاب يتيح قراءة وتنزيلًا مباشرًا وفق سياسة النشر العامة."
    : contentAccess.canReadPublicly
      ? "هذا الكتاب يتيح القراءة المباشرة فقط. التنزيل غير متاح ضمن سياسة هذا الكتاب."
      : contentAccess.canReadPreview
        ? "هذا الكتاب يعرض عينة مجانية فقط. للوصول الكامل استخدم الشراء أو الإيجار."
        : hasOffers
          ? "الوصول الكامل لهذا الكتاب مرتبط بالشراء أو الإيجار، لذلك لن تظهر أزرار القراءة/التحميل العامة."
          : "لا توجد عروض شراء/إيجار أو صلاحية وصول عامة لهذا الكتاب حاليًا.";
  const contentStateNote = !contentAccess.hasReadableContent
    ? "سبب شائع: لم يتم رفع ملف PDF/EPUB أو إضافة محتوى نصي بعد."
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
            publicReadUrl: contentAccess.canReadPublicly || contentAccess.canReadPreview ? `/books/${book.slug}/read` : null,
            publicReadLabel: contentAccess.canReadPreview ? "قراءة عينة" : "اقرأ الآن",
            publicDownloadUrl: contentAccess.canDownloadPublicly && contentAccess.readableFile ? `/api/books/assets/${contentAccess.readableFile.id}?download=1` : null,
            accessGuidance,
            contentStateNote,
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
            userName: review.user.fullName?.trim() || "قارئ في المنصة",
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
