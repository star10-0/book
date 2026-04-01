import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { SiteFooter } from "@/components/site-footer";
import { BooksFilters, BooksGrid, RecommendedBooksSection, SearchHighlightResult } from "@/components/storefront";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

type BooksSearchParams = {
  q?: string;
  category?: string;
  offer?: string;
  sort?: string;
};

export const metadata: Metadata = {
  title: "الكتب",
  description: "اكتشف كتب Amjad عبر البحث والفلاتر بحرية، ثم سجّل الدخول فقط عند تنفيذ إجراءات محمية.",
};

function normalizeOfferType(value?: string): "all" | "buy" | "rent" {
  if (value === "buy" || value === "rent") {
    return value;
  }

  return "all";
}

function normalizeSort(value?: string): "newest" | "title" | "price_asc" | "price_desc" | "rating" {
  if (value === "title" || value === "price_asc" || value === "price_desc" || value === "rating") {
    return value;
  }

  return "newest";
}

function buildSearchWhere(search: string): Prisma.BookWhereInput {
  if (!search) {
    return {};
  }

  return {
    OR: [
      { titleAr: { contains: search, mode: "insensitive" } },
      { titleEn: { contains: search, mode: "insensitive" } },
      { author: { nameAr: { contains: search, mode: "insensitive" } } },
      { author: { nameEn: { contains: search, mode: "insensitive" } } },
    ],
  };
}

export default async function BooksPage({
  searchParams,
}: {
  searchParams?: Promise<BooksSearchParams>;
}) {
  const user = await getCurrentUser();
  const params = (await searchParams) ?? {};
  const search = params.q?.trim() ?? "";
  const category = params.category?.trim() || "all";
  const offerType = normalizeOfferType(params.offer);
  const sort = normalizeSort(params.sort);

  const baseWhere: Prisma.BookWhereInput = {
    status: "PUBLISHED",
    format: "DIGITAL",
    ...buildSearchWhere(search),
    ...(category !== "all"
      ? {
          category: {
            slug: category,
          },
        }
      : {}),
    ...(offerType !== "all"
      ? {
          offers: {
            some: {
              isActive: true,
              type: offerType === "buy" ? "PURCHASE" : "RENTAL",
            },
          },
        }
      : {
          offers: {
            some: {
              isActive: true,
            },
          },
        }),
  };

  const [categories, books, wishlistItems, topRatedBooks] = await Promise.all([
    prisma.category.findMany({
      where: {
        books: {
          some: {
            status: "PUBLISHED",
            format: "DIGITAL",
          },
        },
      },
      orderBy: { nameAr: "asc" },
      select: {
        slug: true,
        nameAr: true,
      },
    }),
    prisma.book.findMany({
      where: baseWhere,
      orderBy: sort === "title" ? { titleAr: "asc" } : { createdAt: "desc" },
      include: {
        author: { select: { nameAr: true } },
        category: { select: { nameAr: true } },
        offers: {
          where: {
            isActive: true,
            ...(offerType !== "all" ? { type: offerType === "buy" ? "PURCHASE" : "RENTAL" } : {}),
          },
          orderBy: { priceCents: "asc" },
          select: {
            id: true,
            type: true,
            priceCents: true,
            currency: true,
            rentalDays: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
      },
    }),
    user
      ? prisma.wishlistItem.findMany({
          where: { userId: user.id },
          select: { bookId: true },
        })
      : Promise.resolve([]),
    prisma.book.findMany({
      where: {
        status: "PUBLISHED",
        format: "DIGITAL",
        offers: {
          some: { isActive: true },
        },
      },
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
      take: 12,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const wishlistIds = new Set(wishlistItems.map((item) => item.bookId));

  const enrichedBooks = books.map((book) => {
    const reviewsCount = book.reviews.length;
    const averageRating = reviewsCount > 0 ? book.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewsCount : 0;

    return {
      ...book,
      averageRating,
      reviewsCount,
    };
  });

  const sortedBooks = [...enrichedBooks].sort((a, b) => {
    if (sort === "price_asc" || sort === "price_desc") {
      const aMin = Math.min(...a.offers.map((offer) => offer.priceCents));
      const bMin = Math.min(...b.offers.map((offer) => offer.priceCents));
      return sort === "price_asc" ? aMin - bMin : bMin - aMin;
    }

    if (sort === "rating") {
      if (b.averageRating === a.averageRating) {
        return b.reviewsCount - a.reviewsCount;
      }

      return b.averageRating - a.averageRating;
    }

    return 0;
  });

  const normalizedSearch = search.toLocaleLowerCase("ar");
  const searchScoredBooks = sortedBooks.map((book) => {
    if (!search) {
      return { book, score: 0 };
    }

    const title = book.titleAr.toLocaleLowerCase("ar");
    const author = book.author.nameAr.toLocaleLowerCase("ar");
    const categoryName = book.category.nameAr.toLocaleLowerCase("ar");

    let score = 0;
    if (title === normalizedSearch) {
      score += 100;
    } else if (title.startsWith(normalizedSearch)) {
      score += 80;
    } else if (title.includes(normalizedSearch)) {
      score += 60;
    }

    if (author.includes(normalizedSearch)) {
      score += 30;
    }

    if (categoryName.includes(normalizedSearch)) {
      score += 10;
    }

    return { book, score };
  });

  const highlightedResult = search
    ? [...searchScoredBooks]
        .sort((a, b) => b.score - a.score)
        .map((item) => item.book)
        .find(Boolean) ?? null
    : null;

  const relatedFromResults =
    highlightedResult !== null
      ? sortedBooks.filter(
          (book) =>
            book.id !== highlightedResult.id &&
            (book.categoryId === highlightedResult.categoryId || book.authorId === highlightedResult.authorId),
        )
      : [];

  const recommended = [...topRatedBooks]
    .map((book) => {
      const reviewsCount = book.reviews.length;
      const averageRating = reviewsCount > 0 ? book.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewsCount : 0;

      return {
        ...book,
        averageRating,
        reviewsCount,
      };
    })
    .sort((a, b) => {
      if (b.averageRating === a.averageRating) {
        return b.reviewsCount - a.reviewsCount;
      }

      return b.averageRating - a.averageRating;
    })
    .slice(0, 3)
    .map((book, index) => ({
      id: book.id,
      slug: book.slug,
      title: book.titleAr,
      author: book.author.nameAr,
      coverImageUrl: book.coverImageUrl,
      category: book.category.nameAr,
      offers: book.offers,
      publisher:
        book.metadata && typeof book.metadata === "object" && !Array.isArray(book.metadata) && typeof book.metadata.publisher === "string"
          ? book.metadata.publisher
          : null,
      isLoggedIn: Boolean(user),
      reason:
        book.reviewsCount > 0
          ? `تقييم ${book.averageRating.toFixed(1)} من ${book.reviewsCount} مراجعة`
          : `اختيار حديث ضمن المنصة #${index + 1}`,
    }));

  const searchRecommendations = highlightedResult
    ? relatedFromResults.slice(0, 3).map((book, index) => ({
        id: book.id,
        slug: book.slug,
        title: book.titleAr,
        author: book.author.nameAr,
        coverImageUrl: book.coverImageUrl,
        category: book.category.nameAr,
        offers: book.offers,
        publisher:
          book.metadata && typeof book.metadata === "object" && !Array.isArray(book.metadata) && typeof book.metadata.publisher === "string"
            ? book.metadata.publisher
            : null,
        isLoggedIn: Boolean(user),
        reason:
          book.categoryId === highlightedResult.categoryId
            ? "مشابه لهذا الكتاب ضمن نفس التصنيف"
            : `لنفس الكاتب • اختيار #${index + 1}`,
      }))
    : [];

  const gridBooks = highlightedResult ? sortedBooks.filter((book) => book.id !== highlightedResult.id) : sortedBooks;
  const highlightedMetadata =
    highlightedResult?.metadata && typeof highlightedResult.metadata === "object" && !Array.isArray(highlightedResult.metadata)
      ? (highlightedResult.metadata as Record<string, unknown>)
      : null;
  const highlightedPublisher = typeof highlightedMetadata?.publisher === "string" ? highlightedMetadata.publisher : null;

  return (
    <main>
      <div className="space-y-5 sm:space-y-6">
        <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-500">متجر الكتب الرقمية</p>
              <h1 className="text-xl font-black text-slate-900 sm:text-2xl">اكتشف كتابك القادم بسهولة</h1>
            </div>
            <span className="store-chip bg-indigo-50 text-indigo-700">{sortedBooks.length} نتيجة</span>
          </div>
        </section>

        {highlightedResult ? (
          <SearchHighlightResult
            book={{
              id: highlightedResult.id,
              slug: highlightedResult.slug,
              title: highlightedResult.titleAr,
              author: highlightedResult.author.nameAr,
              category: highlightedResult.category.nameAr,
              coverImageUrl: highlightedResult.coverImageUrl,
              offers: highlightedResult.offers,
              averageRating: highlightedResult.averageRating,
              reviewsCount: highlightedResult.reviewsCount,
              isWishlisted: wishlistIds.has(highlightedResult.id),
              isLoggedIn: Boolean(user),
              description: highlightedResult.descriptionAr,
              publisher: highlightedPublisher,
            }}
            relatedCount={searchRecommendations.length}
          />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start 2xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="order-2 space-y-6 xl:order-1">
            <section className="space-y-6 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/60 p-4 sm:p-5">
              <RecommendedBooksSection books={highlightedResult ? searchRecommendations : recommended} />
            </section>

            <BooksGrid
              books={gridBooks.map((book) => ({
                id: book.id,
                slug: book.slug,
                title: book.titleAr,
                author: book.author.nameAr,
                category: book.category.nameAr,
                publisher:
                  book.metadata && typeof book.metadata === "object" && !Array.isArray(book.metadata) && typeof book.metadata.publisher === "string"
                    ? book.metadata.publisher
                    : null,
                coverImageUrl: book.coverImageUrl,
                offers: book.offers,
                averageRating: book.averageRating,
                reviewsCount: book.reviewsCount,
                isWishlisted: wishlistIds.has(book.id),
                isLoggedIn: Boolean(user),
              }))}
              hasActiveFilters={Boolean(search) || category !== "all" || offerType !== "all"}
            />
          </div>

          <div className="order-1 xl:order-2 xl:sticky xl:top-24">
            <BooksFilters
              categories={categories}
              search={search}
              category={category}
              offerType={offerType}
              sort={sort}
              resultsCount={sortedBooks.length}
            />
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
