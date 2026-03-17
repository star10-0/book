import { SiteHeader } from "@/components/site-header";
import { BooksFiltersPlaceholder, BooksGrid } from "@/components/storefront";
import { prisma } from "@/lib/prisma";

export default async function BooksPage() {
  const books = await prisma.book.findMany({
    where: { status: "PUBLISHED", format: "DIGITAL" },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { nameAr: true } },
      category: { select: { nameAr: true } },
      offers: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
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
        <BooksFiltersPlaceholder />
        <BooksGrid
          books={books.map((book) => ({
            id: book.id,
            slug: book.slug,
            title: book.titleAr,
            author: book.author.nameAr,
            category: book.category.nameAr,
            coverImageUrl: book.coverImageUrl,
            offers: book.offers,
          }))}
        />
      </div>
    </main>
  );
}
