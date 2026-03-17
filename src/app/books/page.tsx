import type { Prisma } from "@prisma/client";
import { SiteHeader } from "@/components/site-header";
import { BooksFilters, BooksGrid } from "@/components/storefront";
import { prisma } from "@/lib/prisma";

type BooksSearchParams = {
  q?: string;
  category?: string;
  offer?: string;
  sort?: string;
};

function normalizeOfferType(value?: string): "all" | "buy" | "rent" {
  if (value === "buy" || value === "rent") {
    return value;
  }

  return "all";
}

function normalizeSort(value?: string): "newest" | "title" | "price_asc" {
  if (value === "title" || value === "price_asc") {
    return value;
  }

  return "newest";
}

export default async function BooksPage({
  searchParams,
}: {
  searchParams?: Promise<BooksSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const search = params.q?.trim() ?? "";
  const category = params.category?.trim() || "all";
  const offerType = normalizeOfferType(params.offer);
  const sort = normalizeSort(params.sort);

  const whereClause: Prisma.BookWhereInput = {
    status: "PUBLISHED",
    format: "DIGITAL",
    ...(search
      ? {
          titleAr: {
            contains: search,
            mode: "insensitive",
          },
        }
      : {}),
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

  const categories = await prisma.category.findMany({
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
  });

  const books = await prisma.book.findMany({
    where: whereClause,
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
    },
  });

  const sortedBooks =
    sort === "price_asc"
      ? [...books].sort((a, b) => {
          const aMin = Math.min(...a.offers.map((offer) => offer.priceCents));
          const bMin = Math.min(...b.offers.map((offer) => offer.priceCents));

          return aMin - bMin;
        })
      : books;

  return (
    <main>
      <SiteHeader />
      <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h1 className="text-3xl font-bold text-slate-900">مكتبة الكتب</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600 sm:text-base">
          تصفح الكتب الرقمية المتاحة للشراء أو الاستئجار، مع واجهة واضحة وسريعة تناسب كل الأجهزة.
        </p>
      </section>

      <div className="space-y-6">
        <BooksFilters
          categories={categories}
          search={search}
          category={category}
          offerType={offerType}
          sort={sort}
        />
        <BooksGrid
          books={sortedBooks.map((book) => ({
            id: book.id,
            slug: book.slug,
            title: book.titleAr,
            author: book.author.nameAr,
            category: book.category.nameAr,
            coverImageUrl: book.coverImageUrl,
            offers: book.offers,
          }))}
          hasActiveFilters={Boolean(search) || category !== "all" || offerType !== "all"}
        />
      </div>
    </main>
  );
}
